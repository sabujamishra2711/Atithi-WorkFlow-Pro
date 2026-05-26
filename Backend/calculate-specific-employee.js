import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { calculatePayroll, getPayrollForEmployee } from './src/services/payroll.service.js';

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

// Calculate payroll for specific employee A0000165 for December 2025
const calculateSpecificEmployeePayroll = async () => {
    try {
        await connectDB();

        console.log('=== CALCULATING PAYROLL FOR EMPLOYEE A0000165 ===');
        console.log('Month: December 2025 (Month: 12, Year: 2025)');

        const empId = 'A0000165';
        const monthYear = '2025-12';

        // Check if employee exists
        const employee = await User.findOne({ empId });
        if (!employee) {
            console.log(`Employee ${empId} not found in database`);
            process.exit(1);
        }

        console.log(`\nEmployee Details:`);
        console.log(`- ID: ${employee.empId}`);
        console.log(`- Name: ${employee.firstName} ${employee.lastName || ''}`);
        console.log(`- Employee Type: ${employee.employeeType || 'N/A'}`);
        console.log(`- Department: ${employee.department || 'N/A'}`);
        console.log(`- Position: ${employee.position || 'N/A'}`);
        console.log(`- Monthly Salary: ${employee.monthlySalary || 0}`);

        // Calculate payroll for this specific employee
        const payrollData = await getPayrollForEmployee(empId, monthYear);

        console.log(`\n=== PAYROLL CALCULATION RESULTS FOR ${empId} (December 2025) ===`);
        console.log(`Employee: ${payrollData.name}`);
        console.log(`Employee ID: ${payrollData.empId}`);
        console.log(`Fixed Salary: ₹${payrollData.fixedSalary}`);
        console.log(`Present Days: ${payrollData.presentDays}`);
        console.log(`Absent Days: ${payrollData.absentDays}`);
        console.log(`Physical Attendance Days: ${payrollData.physicalAttendanceDays}`);
        console.log(`OT Hours: ${payrollData.otHours}`);
        console.log(`OT Salary: ₹${Number(payrollData.otSalary).toFixed(2)}`);
        console.log(`Gross Salary: ₹${Number(payrollData.grossSalary).toFixed(2)}`);
        console.log(`Total Deductions: ₹${Number(payrollData.totalDeduction).toFixed(2)}`);
        console.log(`Net Salary: ₹${Number(payrollData.netSalary).toFixed(2)}`);
        console.log(`Calculation Type: ${payrollData.calculationType || 'N/A'}`);

        console.log(`\nDeductions Breakdown:`);
        if (payrollData.deductions && payrollData.deductions.length > 0) {
            payrollData.deductions.forEach((deduction, index) => {
                console.log(`  ${index + 1}. ${deduction.name}: ₹${Number(deduction.amount).toFixed(2)} (${deduction.type})`);
            });
        } else {
            console.log('  No deductions applied');
        }

        console.log(`\nLeave Breakdown:`);
        console.log(`  PL (Privilege Leave): ${payrollData.leaveBreakdown?.PL || 0}`);
        console.log(`  LWP (Leave Without Pay): ${payrollData.leaveBreakdown?.LWP || 0}`);
        console.log(`  COFF (Compensatory Off): ${payrollData.leaveBreakdown?.COFF || 0}`);
        console.log(`  OTHER: ${payrollData.leaveBreakdown?.OTHER || 0}`);

        console.log(`\nAdditional Info:`);
        console.log(`  PH Paid: ${payrollData.phPaid || 0}`);
        console.log(`  PH OT Days: ${payrollData.phOtDays || 0}`);
        console.log(`  PH No Pay: ${payrollData.phNoPay || 0}`);

        // Close the connection
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');

    } catch (error) {
        console.error('Error in specific employee payroll calculation:', error);
        process.exit(1);
    }
};

// Run the specific employee calculation
calculateSpecificEmployeePayroll();