// payroll.service.js
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { Deduction } from '../models/deduction.model.js';
import { PayrollSnapshot } from '../models/payrollSnapshot.model.js';
import { SalaryHistory } from '../models/salaryHistory.model.js';
import { Leave } from '../models/leave.model.js';
import { PaidHoliday } from '../models/paidHoliday.model.js';

const payrollCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(year, month) {
  return `payroll_${year}_${month}`;
}

function isCacheValid(cacheEntry) {
  return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL;
}

export function clearPayrollCache(year, month) {
  if (year && month) {
    payrollCache.delete(getCacheKey(year, month));
  } else {
    payrollCache.clear();
  }
}

/**
 * Helper to calculate leave days for an employee in a given month/year
 */
export async function getMonthlyLeaveSummary(employeeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const leaves = await Leave.find({
    employee: employeeId,
    'applications.status': 'Approved',
    'applications.startDate': { $lte: endDate },
    'applications.endDate': { $gte: startDate }
  }).lean();

  const summary = {
    PL: 0,
    CL: 0,
    SL: 0,
    COFF: 0,
    LWP: 0,
    paidLeaveDays: 0
  };

  leaves.forEach(leave => {
    leave.applications.forEach(app => {
      if (app.status !== 'Approved') return;

      const appStart = new Date(app.startDate);
      const appEnd = new Date(app.endDate);

      // Overlap calculation
      const overlapStart = new Date(Math.max(appStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(appEnd.getTime(), endDate.getTime()));

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.ceil((overlapEnd - overlapStart + 1) / (1000 * 60 * 60 * 24));
        if (summary.hasOwnProperty(leave.leaveType)) {
          summary[leave.leaveType] += overlapDays;
          if (leave.leaveType !== 'LWP') {
            summary.paidLeaveDays += overlapDays;
          }
        }
      }
    });
  });

  return summary;
}

async function batchGetLeaveSummaries(employeeIds, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const leaves = await Leave.find({
    employee: { $in: employeeIds },
    'applications.status': 'Approved',
    'applications.startDate': { $lte: endDate },
    'applications.endDate': { $gte: startDate }
  }).lean();

  const summaryMap = {};
  employeeIds.forEach(id => {
    summaryMap[id.toString()] = { PL: 0, CL: 0, SL: 0, COFF: 0, LWP: 0, paidLeaveDays: 0 };
  });

  leaves.forEach(leave => {
    const empKey = leave.employee.toString();
    if (!summaryMap[empKey]) return;

    leave.applications.forEach(app => {
      if (app.status !== 'Approved') return;

      const appStart = new Date(app.startDate);
      const appEnd = new Date(app.endDate);
      const overlapStart = new Date(Math.max(appStart.getTime(), startDate.getTime()));
      const overlapEnd = new Date(Math.min(appEnd.getTime(), endDate.getTime()));

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.ceil((overlapEnd - overlapStart + 1) / (1000 * 60 * 60 * 24));
        if (summaryMap[empKey].hasOwnProperty(leave.leaveType)) {
          summaryMap[empKey][leave.leaveType] += overlapDays;
          if (leave.leaveType !== 'LWP') {
            summaryMap[empKey].paidLeaveDays += overlapDays;
          }
        }
      }
    });
  });

  return summaryMap;
}

async function batchGetSalaryHistory(employeeIds, year, month) {
  const payrollDate = new Date(year, month - 1, 1);

  const histories = await SalaryHistory.find({
    employee: { $in: employeeIds },
    effectiveFrom: { $lte: payrollDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: payrollDate } }
    ]
  }).sort({ effectiveFrom: -1 }).lean();

  const salaryMap = {};
  histories.forEach(h => {
    const empKey = h.employee.toString();
    if (!salaryMap[empKey]) {
      salaryMap[empKey] = h.salary;
    }
  });

  return salaryMap;
}

async function batchGetDeductions(employeeIds, month, year) {
  const deductions = await Deduction.find({
    employee: { $in: employeeIds },
    month,
    year
  }).lean();

  const deductionMap = {};
  employeeIds.forEach(id => {
    deductionMap[id.toString()] = { deductions: [], additions: [] };
  });

  deductions.forEach(entry => {
    const empKey = entry.employee.toString();
    if (!deductionMap[empKey]) return;

    const item = {
      name: entry.type,
      amount: Number(entry.amount) || 0,
      type: 'manual',
      description: entry.notes || `${entry.type}`
    };

    if (entry.type === 'Incentive' || entry.type === 'Bonus') {
      deductionMap[empKey].additions.push(item);
    } else {
      deductionMap[empKey].deductions.push(item);
    }
  });

  return deductionMap;
}




/**
 * Get salary for a specific payroll period from SalaryHistory
 */
export async function getSalaryForPayroll(employeeId, year, month) {
  const payrollDate = new Date(year, month - 1, 1);

  const history = await SalaryHistory.findOne({
    employee: employeeId,
    effectiveFrom: { $lte: payrollDate },
    $or: [
      { effectiveTo: null },
      { effectiveTo: { $gte: payrollDate } }
    ]
  }).sort({ effectiveFrom: -1 });

  return history ? history.salary : null;
}

/**
 * Count weekly off days in a month based on weekday name
 */
function getWeeklyOffCount(year, month, weeklyOffDay, maxDay) {
  if (!weeklyOffDay) return 0;

  const targetDay = getWeekdayIndex(weeklyOffDay);
  if (targetDay === undefined) return 0;

  let count = 0;
  const daysLimit = maxDay || new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysLimit; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === targetDay) {
      count++;
    }
  }

  return count;
}

/**
 * Get weekday index from weekday name
 */
function getWeekdayIndex(weeklyOffDay) {
  const WEEKDAY_INDEX = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  return WEEKDAY_INDEX[weeklyOffDay];
}

/**
 * Check if a date is a weekly off day
 */
function isWeeklyOffDay(date, weeklyOffDay) {
  if (!weeklyOffDay) return false;
  const targetDay = getWeekdayIndex(weeklyOffDay);
  if (targetDay === undefined) return false;
  return new Date(date).getDay() === targetDay;
}

/**
 * Add COFF balance for employee working on weekly off
 * This updates the COFF leave record with the total weekly off days worked in a month
 */
async function updateCoffBalanceForMonth(empId, year, month, coffDaysEarned) {
  if (coffDaysEarned < 0) return;

  try {
    const user = await User.findOne({ empId });
    if (!user) return;

    let leave = await Leave.findOne({
      empId: empId,
      year: year,
      leaveType: 'COFF'
    });

    if (!leave) {
      leave = new Leave({
        employee: user._id,
        empId: empId,
        year: year,
        leaveType: 'COFF',
        allocated: 0,
        used: 0,
        balance: 0,
        monthlyAllocation: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          allocated: 0,
          used: 0,
          balance: 0
        }))
      });
    }

    if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
      leave.monthlyAllocation = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        allocated: 0,
        used: 0,
        balance: 0
      }));
    }

    const monthRecord = leave.monthlyAllocation.find(m => m.month === month);
    if (monthRecord) {
      const previousAllocated = monthRecord.allocated || 0;
      const diff = coffDaysEarned - previousAllocated;

      monthRecord.allocated = coffDaysEarned;
      monthRecord.balance = Math.max(0, coffDaysEarned - (monthRecord.used || 0));

      leave.allocated = leave.monthlyAllocation.reduce((sum, m) => sum + (m.allocated || 0), 0);
      leave.balance = leave.monthlyAllocation.reduce((sum, m) => sum + (m.balance || 0), 0);
    }

    leave.lastAllocated = new Date();
    await leave.save();

    return leave;
  } catch (error) {
    console.error(`Error updating COFF balance for ${empId}:`, error.message);
  }
}

/**
 * Sync COFF balances for all weeklyoffwithcoff employees for a given month
 */
export async function syncCoffBalancesForMonth(year, month) {
  const employees = await User.find({
    employeeType: 'weeklyOffWithCoff',
    status: 'Active',
    role: { $ne: 'ADMIN' }
  }).lean();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const sessions = await AttendanceSession.find({
    inTime: { $gte: startDate, $lte: endDate }
  }).lean();

  const sessionsByEmp = {};
  sessions.forEach(s => {
    if (!sessionsByEmp[s.employeeId]) sessionsByEmp[s.employeeId] = [];
    sessionsByEmp[s.employeeId].push(s);
  });

  const results = [];

  for (const emp of employees) {
    const weeklyOffDay = emp.shiftDetails?.weeklyOff;
    if (!weeklyOffDay) continue;

    const empSessions = sessionsByEmp[emp.empId] || [];
    const weeklyOffDaysWorkedSet = new Set();

    empSessions.forEach(s => {
      if (s.inTime && s.outTime && isWeeklyOffDay(s.inTime, weeklyOffDay)) {
        weeklyOffDaysWorkedSet.add(new Date(s.inTime).getDate());
      }
    });

    const coffEarned = weeklyOffDaysWorkedSet.size;

    if (coffEarned > 0) {
      await updateCoffBalanceForMonth(emp.empId, year, month, coffEarned);
      results.push({ empId: emp.empId, coffEarned });
    }
  }

  return results;
}


export async function calculatePayroll({ year, month, skipCache = false }) {

  if (!year || !month) throw new Error('year and month are required');

  const cacheKey = getCacheKey(year, month);
  const cachedEntry = payrollCache.get(cacheKey);

  if (!skipCache && isCacheValid(cachedEntry)) {
    return cachedEntry.data;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const effectiveEndDate = endDate > today ? today : endDate;

  const [employees, paidHolidays, sessions] = await Promise.all([
    User.find({ role: { $ne: 'ADMIN' }, status: 'Active' }).lean(),
    PaidHoliday.find({ date: { $gte: startDate, $lte: effectiveEndDate } }).lean(),
    AttendanceSession.find({ inTime: { $gte: startDate, $lte: endDate } }).lean()
  ]);

  const employeeIds = employees.map(e => e._id);

  const [leaveSummaryMap, salaryHistoryMap, deductionMap] = await Promise.all([
    batchGetLeaveSummaries(employeeIds, year, month),
    batchGetSalaryHistory(employeeIds, year, month),
    batchGetDeductions(employeeIds, month, year)
  ]);

  const sessionsByEmp = {};
  sessions.forEach(s => {
    if (!sessionsByEmp[s.employeeId]) sessionsByEmp[s.employeeId] = [];
    sessionsByEmp[s.employeeId].push(s);
  });

  const results = [];

  for (const emp of employees) {
    const type = String(emp.employeeType).toLowerCase();
    const empKey = emp._id.toString();

    const leaveSummary = leaveSummaryMap[empKey] || { PL: 0, CL: 0, SL: 0, COFF: 0, LWP: 0, paidLeaveDays: 0 };
    const paidLeaveDays = leaveSummary.paidLeaveDays;
    const lwpDays = leaveSummary.LWP;

    const historicalSalary = salaryHistoryMap[empKey];
    const fixedSalary = historicalSalary !== undefined ? historicalSalary : (Number(emp.monthlySalary) || 0);

    const shiftHours = Math.max(
      Number(emp.shiftDetails?.workHoursPerDay) || 9,
      1
    );

    const empSessions = sessionsByEmp[emp.empId] || [];

    const daysWorkedSet = new Set();
    const weeklyOffDaysWorkedSet = new Set();
    let workedHours = 0;
    const weeklyOffDay = emp.shiftDetails?.weeklyOff;

    empSessions.forEach(s => {
      if (s.inTime && s.outTime) {
        const sessionDate = new Date(s.inTime);
        const d = sessionDate.getDate();

        if (type === 'weeklyoffwithcoff' && isWeeklyOffDay(sessionDate, weeklyOffDay)) {
          weeklyOffDaysWorkedSet.add(d);
        } else {
          daysWorkedSet.add(d);
          workedHours += (new Date(s.outTime) - new Date(s.inTime)) / 3600000;
        }
      }
    });

    const coffEarned = weeklyOffDaysWorkedSet.size;
    const attendancePresentDays = daysWorkedSet.size;
    // For fullmonth: possible days = days in month; for weeklyoff: exclude weekly offs
    const totalPossibleDays = type === 'fullmonth'
      ? daysInMonth
      : daysInMonth - getWeeklyOffCount(year, month, emp.shiftDetails?.weeklyOff);

    let otHours = 0;
    let otSalary = 0;
    let grossSalary = 0;
    let regularHours = 0;
    let phEarnedAmount = 0;
    let earnedAmount = 0;

    let finalPresentDays = 0;
    let finalAbsentDays = 0;

    if (type === 'fullmonth' || type === 'weeklyoff' || type === 'weeklyoffwithcoff') {
      const isWeeklyOffEmployee = type === 'weeklyoff' || type === 'weeklyoffwithcoff';
      const WEEKLY_OFF_DIVISOR = 26;
      const divisor = isWeeklyOffEmployee ? WEEKLY_OFF_DIVISOR : daysInMonth;
      const perDay = fixedSalary / divisor;
      const perHour = perDay / shiftHours;

      const phPaidCount = (attendancePresentDays > 0 || paidLeaveDays > 0) ? paidHolidays.length : 0;
      const phEarned = phPaidCount * perDay;
      phEarnedAmount = phEarned;

      const presentDays = attendancePresentDays + paidLeaveDays;
      const totalAccountedDays = presentDays + phPaidCount;

      const today = new Date();
      const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
      const daysSoFar = isCurrentMonth ? Math.min(today.getDate(), daysInMonth) : daysInMonth;

      // --- AUTOMATIC ADJUSTMENT LOGIC ---
      const isFeb = month === 2;
      const adjustmentDays = isWeeklyOffEmployee ? (WEEKLY_OFF_DIVISOR - totalPossibleDays) : 0;
      const febAdjustment = (adjustmentDays > 0 && isFeb) ? adjustmentDays : 0;
      const extraDayAdjustment = (adjustmentDays < 0) ? adjustmentDays : 0;
      const adjustmentAmount = adjustmentDays * perDay;

      const totalPossibleDaysSoFar = isWeeklyOffEmployee
        ? (isCurrentMonth ? (daysSoFar - getWeeklyOffCount(year, month, weeklyOffDay, daysSoFar)) : totalPossibleDays)
        : daysSoFar;

      const actualAbsentDays = Math.max(0, totalPossibleDaysSoFar - totalAccountedDays);

      const hasActivity = attendancePresentDays > 0 || paidLeaveDays > 0;
      const payableDays = hasActivity ? (attendancePresentDays + paidLeaveDays) : 0;

      earnedAmount = (payableDays * perDay) + (hasActivity ? adjustmentAmount : 0);
      const baseSalary = earnedAmount + phEarned;

      const requiredHours = Math.max(0, attendancePresentDays * shiftHours);

      if (type === 'fullmonth') {
        otHours = hasActivity ? Math.max(Math.floor(workedHours - requiredHours), 0) : 0;
        otSalary = otHours > 0 ? Math.round(otHours * perHour * 100) / 100 : 0;
        regularHours = requiredHours;
      } else {
        otHours = 0;
        otSalary = 0;
        regularHours = 0;
      }

      grossSalary = baseSalary + otSalary;

      finalPresentDays = presentDays;
      finalAbsentDays = actualAbsentDays;

      emp._febAdjustment = febAdjustment;
      emp._extraDayAdjustment = extraDayAdjustment;
    }

    grossSalary = Math.round(grossSalary * 100) / 100;

    const adjustments = deductionMap[empKey] || { deductions: [], additions: [] };

    if (Number(grossSalary) >= 12000) {
      adjustments.deductions.push({
        name: 'Prof Tax/TDS',
        amount: 200,
        type: 'automatic',
        description: 'Automatic Prof Tax/TDS deduction'
      });
    }

    const totalAddition = adjustments.additions.reduce(
      (s, a) => s + Number(a.amount || 0),
      0
    );

    const totalDeduction = adjustments.deductions.reduce(
      (s, d) => s + Number(d.amount || 0),
      0
    );

    const finalGrossSalary = Math.round((grossSalary + totalAddition) * 100) / 100;

    const netSalary = Math.max(
      Math.round((finalGrossSalary - totalDeduction) * 100) / 100,
      0
    );

    results.push({
      empId: emp.empId,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      workerType: String(emp.employeeType).toLowerCase(),
      department: emp.department || '',
      position: emp.position || '',
      fixedSalary,
      attendancePresentDays,
      presentDays: finalPresentDays,
      absentDays: finalAbsentDays,
      otHours: type === 'fullmonth' ? otHours : 0,
      regularHours: type === 'fullmonth' ? regularHours : undefined,
      otSalary: type === 'fullmonth' ? otSalary : 0,
      earned: Math.round(earnedAmount * 100) / 100,
      baseGrossSalary: grossSalary,
      totalAddition,
      grossSalary: finalGrossSalary,
      totalDeduction,
      netSalary,
      febAdjustment: emp._febAdjustment || 0,
      extraDayAdjustment: emp._extraDayAdjustment || 0,
      leaveSummary: {
        PL: leaveSummary.PL,
        CL: leaveSummary.CL,
        SL: leaveSummary.SL,
        COFF: leaveSummary.COFF,
        LWP: leaveSummary.LWP,
        paidLeaveDays: leaveSummary.paidLeaveDays
      },
      deductions: adjustments.deductions,
      additions: adjustments.additions,
      phPaid: (attendancePresentDays > 0 || paidLeaveDays > 0) ? paidHolidays.length : 0,
      phAmount: Math.round(phEarnedAmount * 100) / 100,
      coffEarned: type === 'weeklyoffwithcoff' ? coffEarned : 0,
      weeklyOffDaysWorked: type === 'weeklyoffwithcoff' ? coffEarned : 0
    });
  }

  payrollCache.set(cacheKey, { data: results, timestamp: Date.now() });

  return results;
}

export async function getPayrollForEmployeeWithSnapshot(empId, monthYear) {
  try {
    // Parse month and year
    const [year, month] = monthYear.split('-').map(Number);

    if (!year || !month || month < 1 || month > 12) {
      throw new Error('Invalid month format. Use YYYY-MM');
    }

    // Try to get from snapshot first
    const user = await User.findOne({ empId });
    if (!user) {
      throw new Error('Employee not found');
    }

    // Get payroll snapshot
    const payrollSnapshot = await PayrollSnapshot.findOne({
      'employee': user._id,
      month: month,
      year: year
    }).lean();

    if (payrollSnapshot) {
      if (process.env.NODE_ENV === 'development') console.log(`Found payroll snapshot for ${empId}, ${monthYear}`);

      // Extract values from snapshot
      const snapshotData = {
        empId: empId,
        name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
        fixedSalary: Number(payrollSnapshot.salarySnapshot.monthlySalary) || 0,
        presentDays: Number(payrollSnapshot.salarySnapshot.presentDays) || 0,
        absentDays: Number(payrollSnapshot.salarySnapshot.lopDays) || 0,
        otHours: Number(payrollSnapshot.salarySnapshot.otHours) || 0,
        otSalary: Number(payrollSnapshot.salarySnapshot.otSalary) || 0,
        grossSalary: Number(payrollSnapshot.salarySnapshot.grossSalary) || 0,
        totalDeduction: Number(payrollSnapshot.salarySnapshot.totalDeductions) || 0,
        netSalary: Number(payrollSnapshot.salarySnapshot.netSalary) || 0,
        deductions: Array.isArray(payrollSnapshot.salarySnapshot.deductions) ? payrollSnapshot.salarySnapshot.deductions : [],
        calculationType: 'SNAPSHOT'
      };

      // VALIDATE ATTENDANCE AND SALARY FROM SNAPSHOT
      try {
        // Check for zero-attendance invariant: if both gross and net salary are 0, there should be no attendance
        const zeroAttendance =
          snapshotData.grossSalary === 0 &&
          snapshotData.netSalary === 0;

        if (
          zeroAttendance &&
          (snapshotData.presentDays !== 0 || snapshotData.otHours !== 0)
        ) {
          throw new Error("Snapshot violates zero-attendance invariant");
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error(`SNAPSHOT VALIDATION ERROR for ${empId}:`, error.message);
        // If snapshot validation fails, we should calculate fresh payroll instead of returning invalid snapshot
        if (process.env.NODE_ENV === 'development') console.log(`Snapshot for ${empId} failed validation, calculating fresh payroll...`);

        // Calculate fresh payroll
        const payroll = await calculatePayroll({ year, month });
        const employeePayroll = payroll.find(e => e.empId === empId);

        if (employeePayroll) {
          return employeePayroll;
        } else {
          console.log(`No payroll data found for employee ${empId} after validation failure`);
          // Return default values if no data found
          return {
            empId: empId,
            name: `${user.firstName} ${user.middleName || ''} ${user.lastName}`.trim(),
            fixedSalary: 0,
            presentDays: 0,
            absentDays: 0,
            otHours: 0,
            otSalary: 0,
            grossSalary: 0,
            totalDeduction: 0,
            netSalary: 0,
            deductions: [],
            calculationType: 'VALIDATION_FAILED_SNAPSHOT_FALLBACK'
          };
        }
      }

      return snapshotData;
    }

    // If no snapshot found, calculate fresh payroll for this employee
    if (process.env.NODE_ENV === 'development') console.log(`No snapshot found, calculating fresh payroll for ${empId}, ${monthYear}`);

    // Calculate fresh payroll using the service function
    const payroll = await calculatePayroll({ year, month });
    const employeePayroll = payroll.find(e => e.empId === empId);

    if (process.env.NODE_ENV === 'development') console.log(`Successfully retrieved payroll for ${empId}, totalDeduction: ${employeePayroll.totalDeduction}`);
    return employeePayroll;

  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Error in getPayrollForEmployeeWithSnapshot:', error);
    throw error;
  }
}

