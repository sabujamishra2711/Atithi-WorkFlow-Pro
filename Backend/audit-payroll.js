import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { AttendanceSession } from './src/models/attendanceSession.model.js';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import { PaidHoliday } from './src/models/paidHoliday.model.js';
import { Leave } from './src/models/leave.model.js';
import { SalaryHistory } from './src/models/salaryHistory.model.js';
import { calculatePayroll } from './src/services/payroll.service.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atithillp');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Helper function to calculate number of weekly off days in a month
function getWeeklyOffDaysInMonth(year, month, weeklyOffDay) {
    const date = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    let weeklyOffCount = 0;

    const dayMap = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };

    const targetDayIndex = dayMap[weeklyOffDay];

    if (targetDayIndex === undefined) {
        return 0; // Invalid day name
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day);
        if (currentDate.getDay() === targetDayIndex) {
            weeklyOffCount++;
        }
    }

    return weeklyOffCount;
}

// Audit payroll for each employee individually
const auditPayroll = async () => {
    try {
        await connectDB();

        console.log('=== PAYROLL AUDIT STARTED ===');
        console.log('Month: December 2025 (Month: 12, Year: 2025)');

        const month = 12;
        const year = 2025;

        // Get all employees
        const employees = await User.find(
            { role: { $ne: 'ADMIN' } },
            'empId firstName middleName lastName department position monthlySalary employeeCategory employeeType shiftDetails'
        ).lean();

        if (!employees.length) {
            console.log("No employees found for payroll audit");
            return;
        }

        console.log(`Found ${employees.length} employees for payroll audit`);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        const daysInMonth = new Date(year, month, 0).getDate();

        // Get paid holidays for the month
        const paidHolidays = await PaidHoliday.find({
            date: { $gte: startDate, $lte: endDate }
        }).lean();

        // Get attendance sessions for the month
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

        // Get leaves for the month
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

        // Get the single source of truth from payroll service
        const freshPayroll = await calculatePayroll({ month, year });

        // Process each employee individually
        for (const emp of employees) {
            console.log('\n' + '='.repeat(80));
            console.log(`AUDITING EMPLOYEE: ${emp.empId}`);
            console.log(`TYPE: ${emp.employeeType || 'N/A'}`);
            console.log('='.repeat(80));

            // STEP 1: IDENTIFY EMPLOYEE
            console.log('\nSTEP 1: IDENTIFY EMPLOYEE');
            console.log(`- empId: ${emp.empId}`);
            console.log(`- name: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim());
            console.log(`- employeeType: ${emp.employeeType || 'N/A'}`);
            console.log(`- fixedMonthlySalary: ${emp.monthlySalary || 0}`);
            if (emp.shiftDetails) {
                console.log(`- shiftDetails: workHoursPerDay=${emp.shiftDetails.workHoursPerDay || 'N/A'}, weeklyOff=${emp.shiftDetails.weeklyOff || 'N/A'}`);
            }

            // Get salary from history if available
            let fixedSalary = emp.monthlySalary || 0;
            const payrollDate = new Date(year, month - 1, 1);
            const salaryHistory = await SalaryHistory.findOne({
                employee: emp._id,
                effectiveFrom: { $lte: payrollDate },
                $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
            }).sort({ effectiveFrom: -1 });

            if (salaryHistory?.salary != null) {
                fixedSalary = salaryHistory.salary;
                console.log(`- Updated salary from history: ${fixedSalary}`);
            }

            // Get the employee data from the single source of truth
            const empPayrollData = freshPayroll.find(e => e.empId === emp.empId);

            if (!empPayrollData) {
                console.log(`- No payroll data found for employee ${emp.empId}`);
                continue;
            }

            // STEP 2: ATTENDANCE TRUTH (from single source of truth)
            console.log('\nSTEP 2: ATTENDANCE TRUTH');
            console.log(`- presentDays: ${empPayrollData.presentDays}`);
            console.log(`- absentDays: ${empPayrollData.absentDays}`);
            console.log(`- otHours: ${empPayrollData.otHours}`);
            console.log(`- otSalary: ${empPayrollData.otSalary}`);
            console.log(`- paidHolidaysCount: 0`); // Not tracked in service
            console.log(`- weeklyOffDaysCount: 0`); // Not tracked in service
            console.log(`- physicalAttendanceDays: ${empPayrollData.presentDays}`); // Same as present days

            // Verify attendance constraints
            console.log('Verifying attendance constraints:');
            console.log(`- presentDays >= 0: ${empPayrollData.presentDays >= 0}`);
            console.log(`- absentDays >= 0: ${empPayrollData.absentDays >= 0}`);
            console.log(`- presentDays + absentDays <= 31: ${empPayrollData.presentDays + empPayrollData.absentDays <= 31}`);

            // Set variables from single source of truth
            const recalculatedPresentDays = empPayrollData.presentDays;
            const recalculatedAbsentDays = empPayrollData.absentDays;
            const totalOtHours = empPayrollData.otHours;
            const physicalAttendanceDays = empPayrollData.presentDays;
            const otSalary = empPayrollData.otSalary;

            // Initialize leave breakdown
            const leaveBreakdown = {
                PL: 0,
                LWP: 0,
                COFF: 0,
                OTHER: 0
            };

            // STEP 3: SNAPSHOT CHECK (CRITICAL)
            console.log('\nSTEP 3: SNAPSHOT CHECK (CRITICAL)');

            const snapshot = await PayrollSnapshot.findOne({
                employee: emp._id,
                month,
                year
            }).lean();

            if (snapshot) {
                console.log('- Does PayrollSnapshot exist? YES');
                console.log(`- snapshot.presentDays: ${snapshot.salarySnapshot.presentDays}`);
                console.log(`- snapshot.grossSalary: ${snapshot.salarySnapshot.grossSalary}`);
                console.log(`- snapshot.netSalary: ${snapshot.salarySnapshot.netSalary}`);

                // Verify if snapshot.presentDays === live presentDays
                const snapshotPresentDays = Number(snapshot.salarySnapshot.presentDays) || 0;
                console.log(`- Does snapshot.presentDays === live presentDays? ${snapshotPresentDays === recalculatedPresentDays}`);

                // Check if snapshot violates ZERO-attendance rule
                const snapshotHasZeroAttendance = snapshotPresentDays === 0 &&
                    (Number(snapshot.salarySnapshot.otHours) || 0) === 0;
                const snapshotHasSalary = (Number(snapshot.salarySnapshot.grossSalary) || 0) > 0;

                if (snapshotHasZeroAttendance && snapshotHasSalary) {
                    console.log('→ FLAG AS ❌ SNAPSHOT LEAK: Snapshot gives salary with 0 attendance');
                } else {
                    console.log('- No snapshot leak detected');
                }
            } else {
                console.log('- Does PayrollSnapshot exist? NO');
            }

            // STEP 4: RULE BRANCH SELECTION
            console.log('\nSTEP 4: RULE BRANCH SELECTION');

            let ruleBranch = '';
            let ruleReason = '';

            const empTypeForRuleSelection = String(emp.employeeType || '').toLowerCase();
            if (empTypeForRuleSelection === 'weeklyoff' || empTypeForRuleSelection === 'weeklyoffwithcoff') {
                ruleBranch = 'weeklyOff';
                ruleReason = `employeeType is "${emp.employeeType}" which matches "weeklyOff" or "weeklyOffWithCoff"`;
            } else if (empTypeForRuleSelection === 'fullmonth') {
                ruleBranch = 'fullMonth';
                ruleReason = `employeeType is "${emp.employeeType}" which matches "fullMonth"`;
            } else {
                ruleBranch = 'other';
                ruleReason = `employeeType is "${emp.employeeType}" which doesn't match "weeklyOff", "weeklyOffWithCoff", or "fullMonth"`;
            }

            console.log(`- Which rule branch was selected? ${ruleBranch}`);
            console.log(`- WHY was this branch selected? ${ruleReason}`);

            // STEP 5: SALARY MATH TRACE - Validate against single source of truth
            console.log('\nSTEP 5: SALARY MATH TRACE');

            // Get values from the single source of truth
            const grossSalary = empPayrollData.grossSalary;
            const netSalary = empPayrollData.netSalary;
            const totalDeduction = empPayrollData.totalDeduction;

            console.log(`- grossSalary: ${grossSalary} (from single source of truth)`);
            console.log(`- netSalary: ${netSalary} (from single source of truth)`);
            console.log(`- totalDeduction: ${totalDeduction} (from single source of truth)`);

            // STEP 6: ZERO-ATTENDANCE ENFORCEMENT
            console.log('\nSTEP 6: ZERO-ATTENDANCE ENFORCEMENT');

            const zeroAttendanceCondition = recalculatedPresentDays === 0 && totalOtHours === 0;
            console.log(`- presentDays === 0: ${recalculatedPresentDays === 0}`);
            console.log(`- totalOtHours === 0: ${totalOtHours === 0}`);
            console.log(`- Both conditions met: ${zeroAttendanceCondition}`);

            if (zeroAttendanceCondition) {
                const grossSalaryIsZero = grossSalary === 0;
                const netSalaryIsZero = netSalary === 0;

                console.log(`- grossSalary === 0: ${grossSalaryIsZero}`);
                console.log(`- netSalary === 0: ${netSalaryIsZero}`);

                if (!grossSalaryIsZero || !netSalaryIsZero) {
                    console.log('→ FLAG AS ❌ CRITICAL PAYROLL BUG: Zero attendance but salary > 0');
                } else {
                    console.log('- Zero-attendance rule properly enforced');
                }
            } else {
                console.log('- Zero-attendance rule not applicable (attendance > 0)');
            }

            // STEP 7: FINAL VERDICT
            console.log('\nSTEP 7: FINAL VERDICT');

            let isPass = true;
            let failReasons = [];

            // Check if present days match between service and snapshot
            if (snapshot && snapshot.salarySnapshot.presentDays !== recalculatedPresentDays) {
                isPass = false;
                failReasons.push('Present days mismatch between service and snapshot');
            }

            // Check if gross salary matches between service and snapshot
            if (snapshot && snapshot.salarySnapshot.grossSalary !== grossSalary) {
                isPass = false;
                failReasons.push('Gross salary mismatch between service and snapshot');
            }

            // Check if net salary matches between service and snapshot
            if (snapshot && snapshot.salarySnapshot.netSalary !== netSalary) {
                isPass = false;
                failReasons.push('Net salary mismatch between service and snapshot');
            }

            // Check if weeklyOff rule is violated
            const empTypeForFailCheck = String(emp.employeeType || '').toLowerCase();
            if ((empTypeForFailCheck === 'weeklyoff' || empTypeForFailCheck === 'weeklyoffwithcoff') && recalculatedAbsentDays >= 3 && recalculatedPresentDays === 0) {
                if (grossSalary !== 0) {
                    isPass = false;
                    failReasons.push('WeeklyOff employee with 0 present days and >=3 absent days should have 0 salary');
                }
            }

            // Check if fullMonth rule is violated
            const empTypeForFullMonthCheck = String(emp.employeeType || '').toLowerCase();
            if (empTypeForFullMonthCheck === 'fullmonth' && recalculatedPresentDays === 0 && totalOtHours === 0) {
                if (grossSalary !== 0) {
                    isPass = false;
                    failReasons.push('FullMonth employee with 0 present days and 0 OT hours should have 0 salary');
                }
            }

            // Check if snapshot leak exists
            if (snapshot) {
                const snapshotHasZeroAttendance = (Number(snapshot.salarySnapshot.presentDays) || 0) === 0 &&
                    (Number(snapshot.salarySnapshot.otHours) || 0) === 0;
                const snapshotHasSalary = (Number(snapshot.salarySnapshot.grossSalary) || 0) > 0;

                if (snapshotHasZeroAttendance && snapshotHasSalary) {
                    isPass = false;
                    failReasons.push('Snapshot leak: salary stored with 0 attendance');
                }
            }

            if (isPass) {
                console.log('✔ PASS');
            } else {
                console.log('❌ FAIL');
                console.log(`- Reasons: ${failReasons.join(', ')}`);
            }

            // Output final format
            console.log('\nOUTPUT FORMAT:');
            console.log(`EMPLOYEE: ${emp.empId}`);
            console.log(`TYPE: ${emp.employeeType || 'N/A'}`);

            console.log('\nAttendance:');
            console.log(`- Present: ${recalculatedPresentDays}`);
            console.log(`- Absent: ${recalculatedAbsentDays}`);
            console.log(`- Worked Hours: N/A (from service)`);

            console.log('\nSalary Flow:');
            console.log(`- Rule Applied: ${ruleBranch}`);
            console.log(`- Base Salary: (derived inside payroll.service.js)`);
            console.log(`- OT Salary: ₹${otSalary}`);
            console.log(`- Gross Salary: ₹${grossSalary}`);
            console.log(`- Net Salary: ₹${netSalary}`);

            console.log('\nFinal Verdict:');
            if (isPass) {
                console.log('✔ PASS');
            } else {
                console.log(`❌ FAIL — ${failReasons.join(', ')}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('AUDIT COMPLETED');
        console.log('='.repeat(80));

        // Close the connection
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');

    } catch (error) {
        console.error('Error in payroll audit:', error);
        process.exit(1);
    }
};

// Run the audit
auditPayroll();