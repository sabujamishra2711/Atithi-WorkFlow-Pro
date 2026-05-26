#!/usr/bin/env node

/**
 * Script to fix leave balances for employees
 * This script will correct any incorrect leave allocations
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Function to fix leave balances for a specific employee
const fixEmployeeLeaveBalances = async (empId) => {
  try {
    console.log(`Fixing leave balances for employee: ${empId}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    const currentYear = new Date().getFullYear();
    
    // Fix CL balance
    const clLeave = await Leave.findOne({ empId, year: currentYear, leaveType: 'CL' });
    if (clLeave && clLeave.allocated > 0 && clLeave.balance === 0) {
      console.log(`Fixing CL balance for ${empId}`);
      clLeave.balance = clLeave.allocated;
      await clLeave.save();
      console.log(`CL balance fixed: allocated=${clLeave.allocated}, balance=${clLeave.balance}`);
    }
    
    // Fix SL balance
    const slLeave = await Leave.findOne({ empId, year: currentYear, leaveType: 'SL' });
    if (slLeave && slLeave.allocated > 0 && slLeave.balance === 0) {
      console.log(`Fixing SL balance for ${empId}`);
      slLeave.balance = slLeave.allocated;
      await slLeave.save();
      console.log(`SL balance fixed: allocated=${slLeave.allocated}, balance=${slLeave.balance}`);
    }
    
    console.log(`Leave balances fixed for employee: ${empId}`);
  } catch (error) {
    console.error(`Error fixing leave balances for ${empId}:`, error.message);
  }
};

// Function to fix all employee leave balances
const fixAllLeaveBalances = async () => {
  try {
    await connectDB();
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    console.log(`Fixing leave balances for all employees for year ${currentYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    for (const employee of employees) {
      try {
        await fixEmployeeLeaveBalances(employee.empId);
      } catch (error) {
        console.error(`Error fixing leave balances for ${employee.empId}:`, error.message);
      }
    }
    
    console.log('All leave balances fixed');
    process.exit(0);
  } catch (error) {
    console.error('Error in fixAllLeaveBalances:', error.message);
    process.exit(1);
  }
};

// Function to check leave balances for a specific employee
const checkEmployeeLeaveBalances = async (empId) => {
  try {
    await connectDB();
    
    console.log(`Checking leave balances for employee: ${empId}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    const currentYear = new Date().getFullYear();
    
    // Get all leave records for the employee
    const leaveRecords = await Leave.find({ empId, year: currentYear });
    
    console.log(`Leave balances for ${employee.firstName} ${employee.lastName} (${empId}):`);
    
    leaveRecords.forEach(record => {
      console.log(`  ${record.leaveType}: allocated=${record.allocated}, used=${record.used}, balance=${record.balance}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error(`Error checking leave balances for ${empId}:`, error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--check') && args.length > 1) {
    const empId = args[1];
    await checkEmployeeLeaveBalances(empId);
  } else if (args.includes('--fix') && args.length > 1) {
    const empId = args[1];
    await connectDB();
    await fixEmployeeLeaveBalances(empId);
    process.exit(0);
  } else if (args.includes('--fix-all')) {
    await fixAllLeaveBalances();
  } else {
    console.log('Usage:');
    console.log('  node fix-leave-balances.js --check <empId>     - Check leave balances for an employee');
    console.log('  node fix-leave-balances.js --fix <empId>       - Fix leave balances for an employee');
    console.log('  node fix-leave-balances.js --fix-all           - Fix leave balances for all employees');
    process.exit(0);
  }
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('fix-leave-balances.js')) {
  main().catch(error => {
    console.error('Error in fix leave balances script:', error);
    process.exit(1);
  });
}

export default main;
