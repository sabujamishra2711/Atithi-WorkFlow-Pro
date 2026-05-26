// payroll.service.js
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { Deduction } from '../models/deduction.model.js';
import { PaidHoliday } from '../models/paidHoliday.model.js';
import { Leave } from '../models/leave.model.js';
import { SalaryHistory } from '../models/salaryHistory.model.js';
import { PayrollSnapshot } from '../models/payrollSnapshot.model.js';
import mongoose from 'mongoose';
import { calculateDetailedSalary } from '../utils/salaryCalculator.js';

/**
 * Calculate deductions
 */
async function calculateEmployeeDeductions(employeeId, month, year, grossSalary) {
  const deductions = [];

  const manualDeductions = await Deduction.find({
    employee: employeeId,
    month,
    year
  });

  manualDeductions.forEach(d => {
    deductions.push({
      name: d.type,
      amount: d.amount,
      type: 'manual',
      description: d.notes || `${d.type} deduction`
    });
  });

  if (grossSalary >= 12000) {
    deductions.push({
      name: 'Prof Tax/TDS',
      amount: 200,
      type: 'automatic',
      description: 'Automatic Prof Tax/TDS deduction'
    });
  }

  return deductions;
}

async function calculatePayroll({ month, year }) {
  try {
    const employees = await User.find(
      { role: { $ne: 'ADMIN' } },
      'empId firstName middleName lastName department position monthlySalary employeeCategory employeeType shiftDetails'
    ).lean();

    if (!employees.length) return [];

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    const sessions = await AttendanceSession.find({
      employeeId: { $in: employees.map(e => e.empId) },
      $or: [
        { inTime: { $gte: startDate, $lte: endDate } },
        { outTime: { $gte: startDate, $lte: endDate } },
        { inTime: { $lt: startDate }, outTime: { $gte: startDate, $lte: endDate } }
      ]
    }).lean();

    const sessionsByEmployee = {};
    sessions.forEach(s => {
      if (!sessionsByEmployee[s.employeeId]) {
        sessionsByEmployee[s.employeeId] = [];
      }
      sessionsByEmployee[s.employeeId].push(s);
    });

    const leaveDocs = await Leave.find({
      empId: { $in: employees.map(e => e.empId) },
      'applications.startDate': { $lte: endDate },
      'applications.endDate': { $gte: startDate },
      'applications.status': 'Approved'
    }).lean();

    const leaveByDay = {};
    leaveDocs.forEach(leave => {
      leave.applications.forEach(app => {
        if (app.status !== 'Approved') return;
        const s = new Date(app.startDate);
        const e = new Date(app.endDate);
        let d = new Date(Math.max(s, startDate));
        const end = new Date(Math.min(e, endDate));

        while (d <= end) {
          const key = `${leave.empId}-${d.getDate()}`;
          if (!leaveByDay[key]) leaveByDay[key] = [];
          leaveByDay[key].push({ leaveType: leave.leaveType });
          d.setDate(d.getDate() + 1);
        }
      });
    });

    const payrollPromises = employees.map(async emp => {
      try {
        const snapshot = await PayrollSnapshot.findOne({ employee: emp._id, month, year });
        if (snapshot) {
          return {
            empId: emp.empId,
            name: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim(),
            department: emp.department || 'N/A',
            position: emp.position || 'N/A',
            fixedSalary: snapshot.salarySnapshot.monthlySalary,
            presentDays: snapshot.salarySnapshot.presentDays,
            absentDays: snapshot.salarySnapshot.lopDays,
            grossSalary: snapshot.salarySnapshot.grossSalary,
            netSalary: snapshot.salarySnapshot.netSalary,
            otHours: snapshot.salarySnapshot.otHours,
            otSalary: snapshot.salarySnapshot.otSalary
          };
        }

        let fixedSalary = emp.monthlySalary || 0;
        const payrollDate = new Date(year, month - 1, 1);

        const salaryHistory = await SalaryHistory.findOne({
          employee: emp._id,
          effectiveFrom: { $lte: payrollDate },
          $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
        }).sort({ effectiveFrom: -1 });

        if (salaryHistory?.salary != null) {
          fixedSalary = salaryHistory.salary;
        }

        const empSessions = sessionsByEmployee[emp.empId] || {};
        const sessionsByDay = {};

        empSessions.forEach(s => {
          const day = new Date(s.inTime).getDate();
          if (!sessionsByDay[day]) sessionsByDay[day] = [];
          sessionsByDay[day].push(s);
        });

        let totalOtHours = 0;

        // ✅ FIX: DECLARE BEFORE USE
        let recalculatedPresentDays = 0;
        let recalculatedAbsentDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
          const key = `${emp.empId}-${day}`;
          const leave = leaveByDay[key];
          const sessions = sessionsByDay[day] || [];

          if (leave?.length) {
            recalculatedPresentDays++;
            continue;
          }

          const present = sessions.find(s => s.punchStatus === 'Present' || s.punchStatus === 'In Only');
          if (present) {
            recalculatedPresentDays++;
            let hours = 0;
            sessions.forEach(s => {
              if (s.inTime && s.outTime) {
                hours += (new Date(s.outTime) - new Date(s.inTime)) / 3600000;
              }
            });
            const std = emp.shiftDetails?.workHoursPerDay || 9;
            if (hours > std) totalOtHours += Math.floor(hours - std);
          } else {
            recalculatedAbsentDays++;
          }
        }

        const salaryCalc = calculateDetailedSalary({
          fixedMonthlySalary: fixedSalary,
          standardWorkingDays: daysInMonth,
          presentDays: recalculatedPresentDays,
          absentDays: recalculatedAbsentDays,
          employeeType: emp.employeeType
        });

        const salaryPerDay = fixedSalary / daysInMonth;
        const salaryPerHour = salaryPerDay / (emp.shiftDetails?.workHoursPerDay || 9);

        const otSalary = totalOtHours * salaryPerHour;
        let grossSalary = salaryCalc.finalSalary + otSalary;

        const deductions = await calculateEmployeeDeductions(emp._id, month, year, grossSalary);
        const totalDeduction = deductions.reduce((s, d) => s + d.amount, 0);
        const netSalary = grossSalary - totalDeduction;

        await PayrollSnapshot.updateOne(
          { employee: emp._id, month, year },
          {
            $set: {
              employee: emp._id,
              month,
              year,
              'salarySnapshot.monthlySalary': fixedSalary,
              'salarySnapshot.presentDays': recalculatedPresentDays,
              'salarySnapshot.lopDays': recalculatedAbsentDays,
              'salarySnapshot.grossSalary': grossSalary,
              'salarySnapshot.totalDeductions': totalDeduction,
              'salarySnapshot.netSalary': netSalary,
              'salarySnapshot.otHours': totalOtHours,
              'salarySnapshot.otSalary': otSalary,
              'salarySnapshot.deductions': deductions,
              'meta.generatedAt': new Date()
            }
          },
          { upsert: true }
        );

        return {
          empId: emp.empId,
          name: `${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim(),
          fixedSalary,
          presentDays: recalculatedPresentDays,
          absentDays: recalculatedAbsentDays,
          otHours: totalOtHours,
          otSalary,
          grossSalary,
          netSalary
        };
      } catch (e) {
        return { empId: emp.empId, error: e.message };
      }
    });

    return await Promise.all(payrollPromises);
  } catch (err) {
    throw err;
  }
}

export { calculatePayroll };
