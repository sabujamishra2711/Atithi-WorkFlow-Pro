import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';
import { SalaryHistory } from './src/models/salaryHistory.model.js';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';

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

// Check employee salary for December 2025
const checkEmployeeSalary = async () => {
    try {
        await connectDB();

        // Find employee by empId
        const employee = await User.findOne({ empId: 'A0000026' });

        if (!employee) {
            console.log('Employee A0000026 not found');
            process.exit(1);
        }

        console.log('Employee Details:');
        console.log('- ID:', employee.empId);
        console.log('- Name:', `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`);
        console.log('- Current Monthly Salary:', employee.monthlySalary);
        console.log('- Employee Type:', employee.employeeType);
        console.log('- Department:', employee.department);
        console.log('- Position:', employee.position);
        console.log('');

        // Check salary history
        const salaryHistory = await SalaryHistory.find({ employee: employee._id })
            .sort({ effectiveFrom: -1 });

        console.log('Salary History Records:');
        if (salaryHistory.length === 0) {
            console.log('No salary history records found');
        } else {
            salaryHistory.forEach((record, index) => {
                console.log(`${index + 1}. Salary: ₹${record.salary || 'N/A'}`);
                console.log(`   Effective From: ${record.effectiveFrom ? record.effectiveFrom.toISOString().split('T')[0] : 'N/A'}`);
                console.log(`   Effective To: ${record.effectiveTo ? record.effectiveTo.toISOString().split('T')[0] : 'Present'}`);
                console.log(`   Source: ${record.source || 'N/A'}`);
                console.log('');
            });
        }

        // Check if there's a salary history record for December 2025
        // For December 2025 payroll, we should check the salary that applies during December 2025
        const payrollDate = new Date(2025, 11, 15); // Mid-December 2025 (month 11 is December)
        console.log(`Checking salary for payroll date: ${payrollDate.toISOString().split('T')[0]}`);

        const applicableSalaryHistory = await SalaryHistory.findOne({
            employee: employee._id,
            effectiveFrom: { $lte: payrollDate },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: payrollDate } }]
        }).sort({ effectiveFrom: -1 });

        if (applicableSalaryHistory) {
            console.log('Applicable Salary History for December 2025:');
            console.log('- Salary: ₹', applicableSalaryHistory.salary || 'N/A');
            console.log('- Effective From:', applicableSalaryHistory.effectiveFrom ? applicableSalaryHistory.effectiveFrom.toISOString().split('T')[0] : 'N/A');
            console.log('- Effective To:', applicableSalaryHistory.effectiveTo ? applicableSalaryHistory.effectiveTo.toISOString().split('T')[0] : 'Present');
        } else {
            console.log('No applicable salary history for December 2025');
            console.log('Will use current monthly salary: ₹', employee.monthlySalary);
        }

        // Check for existing payroll snapshot for December 2025
        const snapshot = await PayrollSnapshot.findOne({
            employee: employee._id,
            month: 12,
            year: 2025
        });

        console.log('');
        if (snapshot) {
            console.log('Existing Payroll Snapshot for December 2025:');
            console.log('- Monthly Salary: ₹', (snapshot.salarySnapshot && snapshot.salarySnapshot.monthlySalary) || 'N/A');
            console.log('- Present Days:', (snapshot.salarySnapshot && snapshot.salarySnapshot.presentDays) || 'N/A');
            console.log('- Absent Days:', (snapshot.salarySnapshot && snapshot.salarySnapshot.lopDays) || 'N/A');
            console.log('- Gross Salary: ₹', (snapshot.salarySnapshot && snapshot.salarySnapshot.grossSalary) || 'N/A');
            console.log('- Total Deductions: ₹', (snapshot.salarySnapshot && snapshot.salarySnapshot.totalDeduction) || 'N/A');
            console.log('- Net Salary: ₹', (snapshot.salarySnapshot && snapshot.salarySnapshot.netSalary) || 'N/A');
            console.log('- OT Hours:', (snapshot.salarySnapshot && snapshot.salarySnapshot.otHours) || 'N/A');
            console.log('- OT Salary: ₹', (snapshot.salarySnapshot && snapshot.salarySnapshot.otSalary) || 'N/A');
            console.log('- Generated At:', snapshot.meta && snapshot.meta.generatedAt ? snapshot.meta.generatedAt.toISOString() : 'N/A');
        } else {
            console.log('No existing payroll snapshot for December 2025');
        }

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error checking employee salary:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

checkEmployeeSalary();