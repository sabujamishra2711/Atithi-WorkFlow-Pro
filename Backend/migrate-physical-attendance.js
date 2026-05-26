// migrate-physical-attendance.js
// Migration script to update existing payroll snapshots with physicalAttendanceDays field
// and fix any existing salary leak violations

import mongoose from 'mongoose';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import { User } from './src/models/user.model.js';
import { AttendanceSession } from './src/models/attendanceSession.model.js';

async function migratePhysicalAttendance() {
    console.log('Starting physical attendance migration...');

    try {
        // Connect to database (assuming connection already exists in the app)
        console.log('Updating existing payroll snapshots with physicalAttendanceDays field...');

        // Find all payroll snapshots that don't have physicalAttendanceDays
        const snapshots = await PayrollSnapshot.find({
            'salarySnapshot.physicalAttendanceDays': { $exists: false }
        });

        console.log(`Found ${snapshots.length} snapshots without physicalAttendanceDays`);

        let updatedCount = 0;
        let violationsFixed = 0;

        for (const snapshot of snapshots) {
            try {
                // Get employee details
                const employee = await User.findById(snapshot.employee);
                if (!employee) {
                    console.log(`Employee not found for snapshot: ${snapshot._id}`);
                    continue;
                }

                // Calculate physical attendance days for this employee and month
                const year = snapshot.year;
                const month = snapshot.month;

                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59, 999);

                const sessions = await AttendanceSession.find({
                    employeeId: employee.empId,
                    $or: [
                        { inTime: { $gte: startDate, $lte: endDate } },
                        { outTime: { $gte: startDate, $lte: endDate } },
                        { inTime: { $lt: startDate }, outTime: { $gte: startDate, $lte: endDate } }
                    ]
                }).lean();

                // Count physical attendance days
                const sessionsByDay = {};
                sessions.forEach(s => {
                    const day = new Date(s.inTime).getDate();
                    if (!sessionsByDay[day]) sessionsByDay[day] = [];
                    sessionsByDay[day].push(s);
                });

                let physicalAttendanceDays = 0;
                for (const day in sessionsByDay) {
                    const daySessions = sessionsByDay[day];
                    const present = daySessions.find(s => s.punchStatus === 'Present' || s.punchStatus === 'In Only');
                    if (present) {
                        physicalAttendanceDays++;
                    }
                }

                // Check if this is a zero-attendance violation
                const grossSalary = snapshot.salarySnapshot.grossSalary || 0;
                const netSalary = snapshot.salarySnapshot.netSalary || 0;

                // If physical attendance is 0 but salary is non-zero, this is a violation
                if (physicalAttendanceDays === 0 && (grossSalary !== 0 || netSalary !== 0)) {
                    console.log(`VIOLATION FOUND: Employee ${employee.empId} - Physical days: ${physicalAttendanceDays}, Gross: ${grossSalary}, Net: ${netSalary}`);

                    // Fix the violation by setting salary to 0
                    await PayrollSnapshot.updateOne(
                        { _id: snapshot._id },
                        {
                            $set: {
                                'salarySnapshot.physicalAttendanceDays': 0,
                                'salarySnapshot.grossSalary': 0,
                                'salarySnapshot.netSalary': 0,
                                'salarySnapshot.otHours': 0,
                                'salarySnapshot.otSalary': 0,
                                'meta.fixedByMigration': true,
                                'meta.fixedAt': new Date()
                            }
                        }
                    );

                    console.log(`VIOLATION FIXED: Employee ${employee.empId} - Salary set to 0`);
                    violationsFixed++;
                } else {
                    // Update with calculated physical attendance days
                    await PayrollSnapshot.updateOne(
                        { _id: snapshot._id },
                        {
                            $set: {
                                'salarySnapshot.physicalAttendanceDays': physicalAttendanceDays
                            }
                        }
                    );
                }

                updatedCount++;
                if (updatedCount % 10 === 0) {
                    console.log(`Processed ${updatedCount}/${snapshots.length} snapshots...`);
                }
            } catch (sessionError) {
                console.error(`Error processing snapshot ${snapshot._id}:`, sessionError.message);
            }
        }

        console.log(`Migration completed successfully!`);
        console.log(`- Updated snapshots: ${updatedCount}`);
        console.log(`- Violations fixed: ${violationsFixed}`);

        // Also check for any remaining violations in the database
        console.log('Checking for any remaining violations...');
        const remainingViolations = await PayrollSnapshot.find({
            'salarySnapshot.physicalAttendanceDays': 0,
            $or: [
                { 'salarySnapshot.grossSalary': { $ne: 0 } },
                { 'salarySnapshot.netSalary': { $ne: 0 } }
            ]
        });

        if (remainingViolations.length > 0) {
            console.log(`WARNING: Found ${remainingViolations.length} additional violations that need attention:`);
            remainingViolations.forEach(v => {
                console.log(`- Employee ID: ${v.employee}, Gross: ${v.salarySnapshot.grossSalary}, Net: ${v.salarySnapshot.netSalary}`);
            });
        } else {
            console.log('No remaining violations found!');
        }

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    migratePhysicalAttendance().then(() => {
        console.log('Migration script completed');
        process.exit(0);
    }).catch(error => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}

export { migratePhysicalAttendance };