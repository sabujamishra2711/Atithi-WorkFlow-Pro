#!/usr/bin/env node

/**
 * Script to fix incorrectly allocated PL and LWP leaves
 * This script will recalculate PL and LWP allocations based on actual attendance
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';

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

// Function to calculate present days for an employee
const calculatePresentDays = async (empId, year) => {
  try {
    // Calculate attendance from April of the year to March of next year
    const startDate = new Date(year, 3, 1); // April 1st
    const endDate = new Date(year + 1, 2, 31); // March 31st
    
    // Get all attendance sessions for the employee in the specified period
    const sessions = await AttendanceSession.find({
      employeeId: empId,
      inTime: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Count present days, excluding weekly offs (Sundays)
    let presentDays = 0;
    const weeklyOffDay = 0; // Sunday is 0
    
    sessions.forEach(session => {
      // Check if it's a present day
      if (session.punchStatus === 'Present') {
        // Check if it's not a weekly off
        const dayOfWeek = session.inTime.getDay();
        if (dayOfWeek !== weeklyOffDay) {
          presentDays++;
        }
      }
    });
    
    return presentDays;
  } catch (error) {
    console.error(`Error calculating present days for ${empId}:`, error.message);
    // Return 0 if there's an error
    return 0;
  }
};

// Function to fix PL and LWP allocation for an employee
const fixPLandLWPAllocation = async (empId, year) => {
  try {
    console.log(`\nFixing PL and LWP allocation for employee: ${empId} for year ${year}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    // Calculate actual present days
    const presentDays = await calculatePresentDays(empId, year);
    console.log(`  Present days: ${presentDays}`);
    
    // Calculate correct PL allocation
    let correctPLAllocation = 0;
    if (presentDays >= 240) {
      correctPLAllocation = 12;
    } else if (presentDays >= 20) {
      correctPLAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
    }
    
    console.log(`  Correct PL allocation: ${correctPLAllocation}`);
    
    // Calculate correct LWP allocation (same rules as PL)
    let correctLWPAllocation = 0;
    if (presentDays >= 240) {
      correctLWPAllocation = 12;
    } else if (presentDays >= 20) {
      correctLWPAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
    }
    
    console.log(`  Correct LWP allocation: ${correctLWPAllocation}`);
    
    // Fix PL leave record
    const plLeave = await Leave.findOne({ empId, year, leaveType: 'PL' });
    if (plLeave) {
      const currentPLAllocation = plLeave.allocated;
      const currentPLBalance = plLeave.balance;
      
      console.log(`  Current PL: allocated=${currentPLAllocation}, balance=${currentPLBalance}`);
      
      if (currentPLAllocation !== correctPLAllocation) {
        plLeave.allocated = correctPLAllocation;
        plLeave.balance = correctPLAllocation;
        await plLeave.save();
        console.log(`  PL allocation fixed: ${currentPLAllocation} -> ${correctPLAllocation}`);
      } else {
        console.log(`  PL allocation is already correct`);
      }
    } else {
      console.log(`  No PL record found for year ${year}`);
    }
    
    // Fix LWP leave record
    const lwpLeave = await Leave.findOne({ empId, year, leaveType: 'LWP' });
    if (lwpLeave) {
      const currentLWPAllocation = lwpLeave.allocated;
      const currentLWPBalance = lwpLeave.balance;
      
      console.log(`  Current LWP: allocated=${currentLWPAllocation}, balance=${currentLWPBalance}`);
      
      if (currentLWPAllocation !== correctLWPAllocation) {
        lwpLeave.allocated = correctLWPAllocation;
        lwpLeave.balance = correctLWPAllocation;
        await lwpLeave.save();
        console.log(`  LWP allocation fixed: ${currentLWPAllocation} -> ${correctLWPAllocation}`);
      } else {
        console.log(`  LWP allocation is already correct`);
      }
    } else {
      console.log(`  No LWP record found for year ${year}`);
    }
    
    console.log(`Finished fixing PL and LWP allocation for employee: ${empId}`);
  } catch (error) {
    console.error(`Error fixing PL and LWP allocation for ${empId}:`, error.message);
  }
};

// Function to fix PL and LWP allocation for all employees
const fixAllPLandLWPAllocation = async () => {
  try {
    await connectDB();
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // For PL/LWP allocation, we calculate based on previous year's attendance
    // (April to March period)
    const calculationYear = currentDate.getMonth() < 3 ? currentYear - 1 : currentYear;
    
    console.log(`Fixing PL and LWP allocation for all employees for calculation year ${calculationYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    console.log(`Processing ${employees.length} employees...`);
    
    for (const employee of employees) {
      try {
        await fixPLandLWPAllocation(employee.empId, calculationYear);
      } catch (error) {
        console.error(`Error fixing PL and LWP allocation for ${employee.empId}:`, error.message);
      }
    }
    
    console.log('\nAll PL and LWP allocations fixed');
    process.exit(0);
  } catch (error) {
    console.error('Error in fixAllPLandLWPAllocation:', error.message);
    process.exit(1);
  }
};

// Function to check PL and LWP allocation for an employee
const checkPLandLWPAllocation = async (empId, year) => {
  try {
    await connectDB();
    
    console.log(`Checking PL and LWP allocation for employee: ${empId} for year ${year}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    // Calculate actual present days
    const presentDays = await calculatePresentDays(empId, year);
    console.log(`  Present days: ${presentDays}`);
    
    // Calculate correct PL allocation
    let correctPLAllocation = 0;
    if (presentDays >= 240) {
      correctPLAllocation = 12;
    } else if (presentDays >= 20) {
      correctPLAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
    }
    
    console.log(`  Correct PL allocation: ${correctPLAllocation}`);
    
    // Calculate correct LWP allocation (same rules as PL)
    let correctLWPAllocation = 0;
    if (presentDays >= 240) {
      correctLWPAllocation = 12;
    } else if (presentDays >= 20) {
      correctLWPAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
    }
    
    console.log(`  Correct LWP allocation: ${correctLWPAllocation}`);
    
    // Check PL leave record
    const plLeave = await Leave.findOne({ empId, year, leaveType: 'PL' });
    if (plLeave) {
      console.log(`  Current PL: allocated=${plLeave.allocated}, balance=${plLeave.balance}`);
      if (plLeave.allocated !== correctPLAllocation) {
        console.log(`  *** PL allocation is INCORRECT! Should be ${correctPLAllocation} ***`);
      } else {
        console.log(`  PL allocation is correct`);
      }
    } else {
      console.log(`  No PL record found for year ${year}`);
    }
    
    // Check LWP leave record
    const lwpLeave = await Leave.findOne({ empId, year, leaveType: 'LWP' });
    if (lwpLeave) {
      console.log(`  Current LWP: allocated=${lwpLeave.allocated}, balance=${lwpLeave.balance}`);
      if (lwpLeave.allocated !== correctLWPAllocation) {
        console.log(`  *** LWP allocation is INCORRECT! Should be ${correctLWPAllocation} ***`);
      } else {
        console.log(`  LWP allocation is correct`);
      }
    } else {
      console.log(`  No LWP record found for year ${year}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`Error checking PL and LWP allocation for ${empId}:`, error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.includes('--check') && args.length > 1) {
    const empId = args[1];
    const year = args.length > 2 ? parseInt(args[2]) : new Date().getFullYear();
    await checkPLandLWPAllocation(empId, year);
  } else if (args.includes('--fix') && args.length > 1) {
    const empId = args[1];
    const year = args.length > 2 ? parseInt(args[2]) : new Date().getFullYear();
    await connectDB();
    await fixPLandLWPAllocation(empId, year);
    process.exit(0);
  } else if (args.includes('--fix-all')) {
    await fixAllPLandLWPAllocation();
  } else {
    console.log('Usage:');
    console.log('  node fix-pl-lwp-allocation.js --check <empId> [year]     - Check PL and LWP allocation for an employee');
    console.log('  node fix-pl-lwp-allocation.js --fix <empId> [year]       - Fix PL and LWP allocation for an employee');
    console.log('  node fix-pl-lwp-allocation.js --fix-all                  - Fix PL and LWP allocation for all employees');
    console.log('');
    console.log('Examples:');
    console.log('  node fix-pl-lwp-allocation.js --check A0000089 2025');
    console.log('  node fix-pl-lwp-allocation.js --fix A0000089 2025');
    console.log('  node fix-pl-lwp-allocation.js --fix-all');
    process.exit(0);
  }
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('fix-pl-lwp-allocation.js')) {
  main().catch(error => {
    console.error('Error in fix PL and LWP allocation script:', error);
    process.exit(1);
  });
}

export default main;