#!/usr/bin/env node

/**
 * Script to check attendance records for an employee
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AttendanceSession } from '../models/attendanceSession.model.js';
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

// Function to check attendance records for an employee
const checkAttendance = async (empId) => {
  try {
    await connectDB();
    
    console.log(`Checking attendance records for employee: ${empId}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    console.log(`Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`Employee ID: ${employee.empId}`);
    console.log(`Department: ${employee.department}`);
    console.log(`Designation: ${employee.position}`);
    console.log(`Joining Date: ${employee.joiningDate}`);
    
    // Calculate attendance for the current PL allocation period (April to March)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // For PL allocation, we calculate based on previous year's attendance
    // (April to March period)
    let calculationYear;
    
    // If current month is before April, we calculate for previous year
    // If current month is April or later, we calculate for current year
    if (currentDate.getMonth() < 3) { // Before April (0-2 = Jan-Mar)
      calculationYear = currentYear - 1;
    } else { // April or later (3-11 = Apr-Dec)
      calculationYear = currentYear;
    }
    
    // Calculate the actual period based on employee joining date
    const aprilStartDate = new Date(calculationYear, 3, 1); // April 1st
    const marchEndDate = new Date(calculationYear + 1, 2, 31); // March 31st
    
    // If employee joined after the start of the period, use joining date as start
    let startDate = aprilStartDate;
    if (employee.joiningDate) {
      const joiningDate = new Date(employee.joiningDate);
      if (joiningDate > aprilStartDate) {
        startDate = joiningDate;
      }
    }
    
    const endDate = marchEndDate;
    
    console.log(`\nAttendance period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    console.log(`Calculation year: ${calculationYear}`);
    
    // Get all attendance sessions for the employee in the specified period
    const sessions = await AttendanceSession.find({
      employeeId: empId,
      inTime: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ inTime: 1 });
    
    console.log(`\nTotal sessions found: ${sessions.length}`);
    
    // Count present days (excluding Sundays which are weekly offs)
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
    
    console.log(`\nPresent days (excluding Sundays): ${presentDays}`);
    
    // Calculate PL allocation based on policy
    let plAllocation = 0;
    if (presentDays >= 240) {
      plAllocation = 12;
    } else if (presentDays >= 20) {
      plAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
    }
    
    console.log(`\nPL Allocation Calculation:`);
    console.log(`  Present days: ${presentDays}`);
    console.log(`  Required for full allocation (240+ days): ${presentDays >= 240 ? 'Yes' : 'No'}`);
    console.log(`  Minimum required (20+ days): ${presentDays >= 20 ? 'Yes' : 'No'}`);
    console.log(`  Calculated PL allocation: ${plAllocation}`);
    
    // Show some sample sessions
    console.log(`\nSample sessions (first 5):`);
    sessions.slice(0, 5).forEach(session => {
      console.log(`  ${session.inTime.toISOString().split('T')[0]} - Status: ${session.punchStatus}`);
    });
    
    if (sessions.length > 5) {
      console.log(`  ... and ${sessions.length - 5} more sessions`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking attendance:', error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node check-attendance.js <empId>');
    console.log('Example: node check-attendance.js A0000089');
    process.exit(1);
  }
  
  const empId = args[0];
  await checkAttendance(empId);
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('check-attendance.js')) {
  main().catch(error => {
    console.error('Error in check attendance script:', error);
    process.exit(1);
  });
}

export default checkAttendance;