import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import { AttendanceSession } from './src/models/attendanceSession.model.js';
import { Leave } from './src/models/leave.model.js';
import { PaidHoliday } from './src/models/paidHoliday.model.js';
import { calculatePayroll } from './src/services/payroll.service.js';

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

/**
 * Helper function to calculate number of weekly off days in a month
 */
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

/**
 * Recalculate attendance for an employee
 */
async function recalculateAttendance(emp, month, year) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get attendance sessions for this employee in the month
    const sessions = await AttendanceSession.find({
        employeeId: emp.empId,
        $or: [
            { inTime: { $gte: startDate, $lte: endDate } },
            { outTime: { $gte: startDate, $lte: endDate } },
            { inTime: { $lt: startDate }, outTime: { $gte: startDate, $lte: endDate } }
        ]
    }).lean();

    // Get leaves for this employee in the month
    const leaveDocs = await Leave.find({
        empId: emp.empId,
        'applications.startDate': { $lte: endDate },
        'applications.endDate': { $gte: startDate },
        'applications.status': 'Approved'
    }).lean();

    // Get paid holidays for the month
    const paidHolidays = await PaidHoliday.find({
        date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Process attendance data
    const empSessions = sessions.filter(s => s.employeeId === emp.empId);

    // Calculate attendance metrics
    let totalWorkedHours = 0;
    let totalOtHours = 0;
    let physicalAttendanceDays = 0;
    let paidHolidayDays = 0;
    let weeklyOffDays = 0;
    let leaveDays = 0;

    // Calculate worked hours and OT hours
    empSessions.forEach(session => {
        if (session.inTime && session.outTime) {
            const inTime = new Date(session.inTime);
            const outTime = new Date(session.outTime);
            const sessionHours = (outTime - inTime) / 3600000; // Convert ms to hours

            if (sessionHours > 0) {
                totalWorkedHours += sessionHours;

                // Calculate OT hours (anything over standard work hours per day)
                const standardHoursPerDay = emp.shiftDetails?.workHoursPerDay || 9;
                if (sessionHours > standardHoursPerDay) {
                    totalOtHours += (sessionHours - standardHoursPerDay);
                }
            }

            // Count physical attendance days
            const sessionDate = new Date(inTime);
            const dateKey = `${sessionDate.getFullYear()}-${sessionDate.getMonth()}-${sessionDate.getDate()}`;
            if (!new Set().has(dateKey)) {
                physicalAttendanceDays++;
            }
        }
    });

    // Calculate leave days
    const leaveByDay = {};
    leaveDocs.forEach(leave => {
        const leaveApp = leave.applications.find(app => app.status === 'Approved');
        if (leaveApp) {
            let s = new Date(leaveApp.startDate);
            const e = new Date(leaveApp.endDate);

            while (s <= e) {
                if (s >= startDate && s <= endDate) {
                    const key = `${emp.empId}-${s.getDate()}`;
                    if (!leaveByDay[key]) leaveByDay[key] = [];
                    leaveByDay[key].push({ leaveType: leaveApp.leaveType });
                }
                s.setDate(s.getDate() + 1);
            }
        }
    });

    leaveDays = Object.keys(leaveByDay).length;

    // Calculate paid holiday days
    const phDates = paidHolidays.map(ph => {
        const phDate = new Date(ph.date);
        return `${phDate.getFullYear()}-${phDate.getMonth()}-${phDate.getDate()}`;
    });

    // Calculate weekly off days if applicable
    if (emp.shiftDetails?.weeklyOff) {
        weeklyOffDays = getWeeklyOffDaysInMonth(year, month, emp.shiftDetails.weeklyOff);
    }

    // Calculate present and absent days
    const daysInMonth = new Date(year, month, 0).getDate();
    let effectiveWorkingDays = daysInMonth;

    if (emp.shiftDetails?.weeklyOff) {
        const weeklyOffDaysInMonth = getWeeklyOffDaysInMonth(year, month, emp.shiftDetails.weeklyOff);
        effectiveWorkingDays = daysInMonth - weeklyOffDaysInMonth;
    }

    // Calculate present days as physical attendance + paid leave + paid holidays
    const presentDays = physicalAttendanceDays + leaveDays + paidHolidayDays;
    const absentDays = effectiveWorkingDays - presentDays;

    return {
        presentDays: Math.max(presentDays, 0),
        absentDays: Math.max(absentDays, 0),
        totalWorkedHours,
        totalOtHours,
        physicalAttendanceDays,
        paidHolidayDays,
        weeklyOffDays,
        leaveDays
    };
}

/**
 * Fix payroll for failed employees
 */
async function fixPayrollFailures() {
    console.log('=== STARTING PAYROLL AUDIT FAILURE FIXES ===');

    // Define the failed employees from the audit results
    const failedEmployees = [
        'A0000165', 'A0000163', 'A0000159', 'A0000058', 'A0000065',
        'A0000092', 'A0000079', 'A0000125', 'A0000124', 'A0000108'
    ];

    // Month and year for December 2025
    const month = 12;
    const year = 2025;

    for (const empId of failedEmployees) {
        try {
            console.log(`\n--- PROCESSING EMPLOYEE: ${empId} ---`);

            // Find employee
            const emp = await User.findOne({ empId }).lean();
            if (!emp) {
                console.log(`Employee ${empId} not found`);
                continue;
            }

            console.log(`Employee: ${emp.firstName} ${emp.lastName || ''} (${emp.employeeType})`);
            console.log(`Fixed Monthly Salary: ${emp.monthlySalary}`);

            // Get the correct payroll data from the single source of truth
            console.log('Getting fresh payroll data from single source of truth');
            const freshPayroll = await calculatePayroll({ month, year });
            const empRow = freshPayroll.find(e => e.empId === emp.empId);

            if (!empRow) {
                console.log(`ERROR: Could not find employee ${emp.empId} in fresh payroll data`);
                continue; // Skip this employee
            }

            // Use the values from the single source of truth
            const presentDays = empRow.presentDays;
            const otHours = empRow.otHours;
            const grossSalary = empRow.grossSalary;
            const netSalary = empRow.netSalary;
            const otSalaryValue = empRow.otSalary;
            const totalDeduction = empRow.totalDeduction;
            const calculationType = 'FIXED_FROM_SERVICE';

            // Get the current snapshot to show 'before' values
            const currentSnapshot = await PayrollSnapshot.findOne({
                employee: emp._id,
                month: month,
                year: year
            });

            // STEP 4: FORCE ZERO CHECK - Use values from single source of truth
            if (presentDays === 0 && otHours === 0) {
                console.log('APPLYING ZERO ATTENDANCE RULE: Setting salary to 0');

                // Update the payroll snapshot
                const updateResult = await PayrollSnapshot.updateOne(
                    {
                        employee: emp._id,
                        month: month,
                        year: year
                    },
                    {
                        $set: {
                            'salarySnapshot.presentDays': 0,
                            'salarySnapshot.grossSalary': 0,
                            'salarySnapshot.netSalary': 0,
                            'salarySnapshot.totalDeduction': 0,
                            'salarySnapshot.otHours': 0,
                            'salarySnapshot.otSalary': 0,
                            'salarySnapshot.deductions': [],
                            'salarySnapshot.calculationType': 'FORCED_ZERO_ATTENDANCE',
                            'meta.correctedBy': 'AUTO_REPAIR',
                            'meta.correctedAt': new Date()
                        }
                    }
                );

                if (updateResult.modifiedCount > 0) {
                    console.log(`EMPLOYEE: ${empId}`);
                    console.log(`STATUS: FIXED`);
                    console.log('');
                    console.log('Before:');
                    console.log(`- Gross Salary: ₹${currentSnapshot?.salarySnapshot?.grossSalary || 'N/A'}`);
                    console.log(`- Net Salary: ₹${currentSnapshot?.salarySnapshot?.netSalary || 'N/A'}`);
                    console.log('');
                    console.log('After:');
                    console.log('- Gross Salary: ₹0');
                    console.log('- Net Salary: ₹0');
                    console.log('');
                    console.log('Reason:');
                    console.log('- ZERO ATTENDANCE RULE (presentDays === 0 AND otHours === 0)');
                } else {
                    console.log(`⚠️ No snapshot found for employee ${empId}`);
                }
                continue;
            }

            console.log(`Fetched Salary from service: Present=${presentDays}, OT=${otHours}, Gross=${grossSalary}, Net=${netSalary}, Deductions=${totalDeduction}`);

            // Update the payroll snapshot
            const updateResult = await PayrollSnapshot.updateOne(
                {
                    employee: emp._id,
                    month: month,
                    year: year
                },
                {
                    $set: {
                        'salarySnapshot.monthlySalary': emp.monthlySalary,
                        'salarySnapshot.presentDays': presentDays,
                        'salarySnapshot.grossSalary': grossSalary,
                        'salarySnapshot.totalDeduction': totalDeduction,
                        'salarySnapshot.netSalary': netSalary,
                        'salarySnapshot.otHours': otHours,
                        'salarySnapshot.otSalary': otSalaryValue,
                        'salarySnapshot.deductions': [],
                        'salarySnapshot.calculationType': calculationType,
                        'meta.correctedBy': 'AUTO_REPAIR',
                        'meta.correctedAt': new Date()
                    }
                }
            );

            if (updateResult.modifiedCount > 0) {
                console.log(`EMPLOYEE: ${empId}`);
                console.log(`STATUS: FIXED`);
                console.log('');
                console.log('Before:');
                console.log(`- Gross Salary: ₹${currentSnapshot?.salarySnapshot?.grossSalary || 'N/A'}`);
                console.log(`- Net Salary: ₹${currentSnapshot?.salarySnapshot?.netSalary || 'N/A'}`);
                console.log('');
                console.log('After:');
                console.log(`- Gross Salary: ₹${grossSalary}`);
                console.log(`- Net Salary: ₹${netSalary}`);
                console.log('');
                console.log('Reason:');
                console.log(`- Applied ${emp.employeeType} rules correctly`);
            } else {
                console.log(`⚠️ No snapshot found for employee ${empId}`);
            }

        } catch (error) {
            console.error(`Error processing employee ${empId}:`, error.message);
        }
    }

    console.log('\n=== PAYROLL AUDIT FAILURE FIXES COMPLETED ===');
}

// Run the fix
const runFix = async () => {
    try {
        await connectDB();
        await fixPayrollFailures();
        console.log('Payroll audit failure fixes completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error in runFix:', error);
        process.exit(1);
    }
};

runFix();