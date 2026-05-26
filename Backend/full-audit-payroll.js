import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { AttendanceSession } from './src/models/attendanceSession.model.js';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import { PaidHoliday } from './src/models/paidHoliday.model.js';
import { Leave } from './src/models/leave.model.js';
import { SalaryHistory } from './src/models/salaryHistory.model.js';
import { Deduction } from './src/models/deduction.model.js';
import { calculatePayroll } from './src/services/payroll.service.js';
import fs from 'fs';

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
            'empId firstName middleName lastName department position monthlySalary employeeCategory employeeType shiftDetails _id'
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

        let auditResults = '';
        let passCount = 0;
        let failCount = 0;

        // Get the single source of truth from payroll service
        const freshPayroll = await calculatePayroll({ month, year });

        // Process each employee individually
        for (const emp of employees) {
            let employeeAudit = `\n${'='.repeat(80)}\n`;
            employeeAudit += `AUDITING EMPLOYEE: ${emp.empId}\n`;
            employeeAudit += `TYPE: ${emp.employeeType || 'N/A'}\n`;
            employeeAudit += `${'='.repeat(80)}\n`;

            // STEP 1: IDENTIFY EMPLOYEE
            let step1 = '\nSTEP 1: IDENTIFY EMPLOYEE\n';
            step1 += `- empId: ${emp.empId}\n`;
            step1 += `- name: ${emp.firstName} ${emp.middleName || ''} ${emp.lastName}`.trim() + '\n';
            step1 += `- employeeType: ${emp.employeeType || 'N/A'}\n`;
            step1 += `- fixedMonthlySalary: ${emp.monthlySalary || 0}\n`;
            if (emp.shiftDetails) {
                step1 += `- shiftDetails: workHoursPerDay=${emp.shiftDetails.workHoursPerDay || 'N/A'}, weeklyOff=${emp.shiftDetails.weeklyOff || 'N/A'}\n`;
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
                step1 += `- Updated salary from history: ${fixedSalary}\n`;
            }
            step1 += '\n';

            // Get the employee data from the single source of truth
            const empPayrollData = freshPayroll.find(e => e.empId === emp.empId);

            if (!empPayrollData) {
                console.log(`- No payroll data found for employee ${emp.empId}`);
                continue;
            }

            // STEP 2: ATTENDANCE TRUTH (from single source of truth)
            let step2 = 'STEP 2: ATTENDANCE TRUTH\n';
            step2 += `- presentDays: ${empPayrollData.presentDays}\n`;
            step2 += `- absentDays: ${empPayrollData.absentDays}\n`;
            step2 += `- otHours: ${empPayrollData.otHours}\n`;
            step2 += `- otSalary: ${empPayrollData.otSalary}\n`;
            step2 += `- paidHolidaysCount: 0\n`; // Not tracked in service
            step2 += `- weeklyOffDaysCount: 0\n`; // Not tracked in service
            step2 += `- physicalAttendanceDays: ${empPayrollData.presentDays}\n`; // Same as present days

            // Verify attendance constraints
            step2 += '\nVerifying attendance constraints:\n';
            step2 += `- presentDays >= 0: ${empPayrollData.presentDays >= 0}\n`;
            step2 += `- absentDays >= 0: ${empPayrollData.absentDays >= 0}\n`;
            step2 += `- presentDays + absentDays <= 31: ${empPayrollData.presentDays + empPayrollData.absentDays <= 31}\n`;
            step2 += '\n';

            // STEP 3: SNAPSHOT CHECK (CRITICAL)
            let step3 = 'STEP 3: SNAPSHOT CHECK (CRITICAL)\n';

            const snapshot = await PayrollSnapshot.findOne({
                employee: emp._id,
                month,
                year
            }).lean();

            if (snapshot) {
                step3 += '- Does PayrollSnapshot exist? YES\n';
                step3 += `- snapshot.presentDays: ${snapshot.salarySnapshot.presentDays}\n`;
                step3 += `- snapshot.grossSalary: ${snapshot.salarySnapshot.grossSalary}\n`;
                step3 += `- snapshot.netSalary: ${snapshot.salarySnapshot.netSalary}\n`;

                // Verify if snapshot.presentDays === live presentDays
                const snapshotPresentDays = Number(snapshot.salarySnapshot.presentDays) || 0;
                step3 += `- Does snapshot.presentDays === live presentDays? ${snapshotPresentDays === empPayrollData.presentDays}\n`;

                // Check if snapshot violates ZERO-attendance rule
                const snapshotHasZeroAttendance = snapshotPresentDays === 0 &&
                    (Number(snapshot.salarySnapshot.otHours) || 0) === 0;
                const snapshotHasSalary = (Number(snapshot.salarySnapshot.grossSalary) || 0) > 0;

                if (snapshotHasZeroAttendance && snapshotHasSalary) {
                    step3 += '→ FLAG AS ❌ SNAPSHOT LEAK: Snapshot gives salary with 0 attendance\n';
                } else {
                    step3 += '- No snapshot leak detected\n';
                }
            } else {
                step3 += '- Does PayrollSnapshot exist? NO\n';
            }
            step3 += '\n';

            // STEP 4: RULE BRANCH SELECTION
            let step4 = 'STEP 4: RULE BRANCH SELECTION\n';

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

            step4 += `- Which rule branch was selected? ${ruleBranch}\n`;
            step4 += `- WHY was this branch selected? ${ruleReason}\n`;
            step4 += '\n';

            // STEP 5: SALARY MATH TRACE - Validate against single source of truth
            let step5 = 'STEP 5: SALARY MATH TRACE\n';

            // Get values from the single source of truth
            const grossSalary = empPayrollData.grossSalary;
            const netSalary = empPayrollData.netSalary;
            const totalDeduction = empPayrollData.totalDeduction;

            step5 += `- grossSalary: ${grossSalary} (from single source of truth)\n`;
            step5 += `- netSalary: ${netSalary} (from single source of truth)\n`;
            step5 += `- totalDeduction: ${totalDeduction} (from single source of truth)\n`;
            step5 += '\n';

            // STEP 6: ZERO-ATTENDANCE ENFORCEMENT
            let step6 = 'STEP 6: ZERO-ATTENDANCE ENFORCEMENT\n';

            const zeroAttendanceCondition = empPayrollData.presentDays === 0 && empPayrollData.otHours === 0;
            step6 += `- presentDays === 0: ${empPayrollData.presentDays === 0}\n`;
            step6 += `- otHours === 0: ${empPayrollData.otHours === 0}\n`;
            step6 += `- Both conditions met: ${zeroAttendanceCondition}\n`;

            if (zeroAttendanceCondition) {
                const grossSalaryIsZero = grossSalary === 0;
                const netSalaryIsZero = netSalary === 0;

                step6 += `- grossSalary === 0: ${grossSalaryIsZero}\n`;
                step6 += `- netSalary === 0: ${netSalaryIsZero}\n`;

                if (!grossSalaryIsZero || !netSalaryIsZero) {
                    step6 += '→ FLAG AS ❌ CRITICAL PAYROLL BUG: Zero attendance but salary > 0\n';
                } else {
                    step6 += '- Zero-attendance rule properly enforced\n';
                }
            } else {
                step6 += '- Zero-attendance rule not applicable (attendance > 0)\n';
            }
            step6 += '\n';

            // STEP 7: FINAL VERDICT
            let step7 = 'STEP 7: FINAL VERDICT\n';

            let isPass = true;
            let failReasons = [];

            // Check if present days match between service and snapshot
            if (snapshot && snapshot.salarySnapshot.presentDays !== empPayrollData.presentDays) {
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
            if ((empTypeForFailCheck === 'weeklyoff' || empTypeForFailCheck === 'weeklyoffwithcoff') && empPayrollData.absentDays >= 3 && empPayrollData.presentDays === 0) {
                if (grossSalary !== 0) {
                    isPass = false;
                    failReasons.push('WeeklyOff employee with 0 present days and >=3 absent days should have 0 salary');
                }
            }

            // Check if fullMonth rule is violated
            const empTypeForFullMonthCheck = String(emp.employeeType || '').toLowerCase();
            if (empTypeForFullMonthCheck === 'fullmonth' && empPayrollData.presentDays === 0 && empPayrollData.otHours === 0) {
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
                step7 += '✔ PASS\n';
                passCount++;
            } else {
                step7 += '❌ FAIL\n';
                step7 += `- Reasons: ${failReasons.join(', ')}\n`;
                failCount++;
            }
            step7 += '\n';

            // Output final format
            const outputFormat = 'OUTPUT FORMAT:\n';
            const output = `EMPLOYEE: ${emp.empId}\n`;
            const type = `TYPE: ${emp.employeeType || 'N/A'}\n`;
            const attendance = `
Attendance:
- Present: ${empPayrollData.presentDays}
- Absent: ${empPayrollData.absentDays}
- Worked Hours: N/A (from service)
`;
            const salaryFlow = `
Salary Flow:
- Rule Applied: ${ruleBranch}
- Base Salary: (derived inside payroll.service.js)
- OT Salary: ₹${empPayrollData.otSalary}
- Gross Salary: ₹${grossSalary}
- Net Salary: ₹${netSalary}
`;
            const verdict = `
Final Verdict:
${isPass ? '✔ PASS' : '❌ FAIL — ' + failReasons.join(', ')}

`;

            const employeeResult = employeeAudit + step1 + step2 + step3 + step4 + step5 + step6 + step7 + outputFormat + output + type + attendance + salaryFlow + verdict;

            auditResults += employeeResult;
            console.log(`Audited employee: ${emp.empId} - ${isPass ? 'PASS' : 'FAIL'}`);
        }

        const summary = `${'='.repeat(80)}\nAUDIT COMPLETED\n${'='.repeat(80)}\n`;
        const totalSummary = `Total Employees: ${employees.length}
PASS: ${passCount}
FAIL: ${failCount}

`;

        console.log(`\n${summary}${totalSummary}`);

        // Write results to file
        const fullResults = `${summary}${totalSummary}${auditResults}`;
        fs.writeFileSync('payroll-audit-results.txt', fullResults);
        console.log('Audit results written to payroll-audit-results.txt');

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