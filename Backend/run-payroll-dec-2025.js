import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { calculatePayroll } from './src/services/payroll.service.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atithillp');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const runFullPayroll = async () => {
    try {
        await connectDB();

        console.log('=== RUNNING FULL PAYROLL CALCULATION FOR DECEMBER 2025 ===');
        console.log('Calculating payroll for December 2025 (Month: 12, Year: 2025)');

        const payrollResults = await calculatePayroll({ month: 12, year: 2025 });

        // Filter for employee A0000165
        const employeeResult = payrollResults.find(emp => emp.empId === 'A0000165');

        if (employeeResult) {
            console.log('\n=== DETAILED PAYROLL RESULTS FOR A0000165 (December 2025) ===');
            console.log('Employee:', employeeResult.name);
            console.log('Employee ID:', employeeResult.empId);
            console.log('Fixed Salary:', '₹' + employeeResult.fixedSalary);
            console.log('Present Days:', employeeResult.presentDays);
            console.log('Absent Days:', employeeResult.absentDays);
            console.log('Physical Attendance Days:', employeeResult.physicalAttendanceDays);
            console.log('OT Hours:', employeeResult.otHours);
            console.log('OT Salary:', '₹' + Number(employeeResult.otSalary).toFixed(2));
            console.log('Gross Salary:', '₹' + Number(employeeResult.grossSalary).toFixed(2));
            console.log('Total Deductions:', '₹' + Number(employeeResult.totalDeduction).toFixed(2));
            console.log('Net Salary:', '₹' + Number(employeeResult.netSalary).toFixed(2));
            console.log('Calculation Type:', employeeResult.calculationType);

            console.log('\nDeductions Breakdown:');
            if (employeeResult.deductions && employeeResult.deductions.length > 0) {
                employeeResult.deductions.forEach((deduction, index) => {
                    console.log(`  ${index + 1}. ${deduction.name}: ₹${Number(deduction.amount).toFixed(2)} (${deduction.type})`);
                });
            } else {
                console.log('  No deductions applied');
            }
        } else {
            console.log('Employee A0000165 not found in payroll results');
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    } catch (error) {
        console.error('Error in full payroll calculation:', error);
    }
};

runFullPayroll();