#!/usr/bin/env node

/**
 * Script to check Sunday attendance for COFF allocation
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

// Function to get all Sundays in a year
const getSundaysInYear = (year) => {
  const sundays = [];
  const date = new Date(year, 0, 1); // January 1st
  
  // Move to the first Sunday of the year
  while (date.getDay() !== 0) {
    date.setDate(date.getDate() + 1);
  }
  
  // Collect all Sundays in the year
  while (date.getFullYear() === year) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  
  return sundays;
};

// Function to check Sunday attendance
const checkSundayAttendance = async (empId, year = new Date().getFullYear()) => {
  try {
    await connectDB();
    
    console.log(`Checking Sunday attendance for employee: ${empId} in year ${year}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    // Check if eligible for COFF
    const isEligibleForCOFF = employee.employeeType === 'weeklyOffWithCoff';
    console.log(`Eligible for COFF: ${isEligibleForCOFF ? 'Yes' : 'No'}`);
    
    if (!isEligibleForCOFF) {
      console.log('Employee is not eligible for COFF allocation');
      return;
    }
    
    // Get all Sundays in the year
    const sundays = getSundaysInYear(year);
    console.log(`\nTotal Sundays in ${year}: ${sundays.length}`);
    
    // Check attendance for each Sunday
    let sundaysWorked = 0;
    const workedSundays = [];
    
    for (const sunday of sundays) {
      // Create start and end of the day
      const sundayStart = new Date(sunday);
      sundayStart.setHours(0, 0, 0, 0);
      
      const sundayEnd = new Date(sunday);
      sundayEnd.setHours(23, 59, 59, 999);
      
      // Check if there's an attendance session on this Sunday
      const sundaySession = await AttendanceSession.findOne({
        employeeId: empId,
        inTime: { $gte: sundayStart, $lte: sundayEnd }
      });
      
      if (sundaySession) {
        sundaysWorked++;
        workedSundays.push({
          date: sunday.toISOString().split('T')[0],
          inTime: sundaySession.inTime,
          outTime: sundaySession.outTime,
          status: sundaySession.punchStatus
        });
      }
    }
    
    console.log(`\nSundays worked: ${sundaysWorked}`);
    console.log(`COFF allocation should be: ${sundaysWorked}`);
    
    // Check current COFF allocation
    const currentYear = new Date().getFullYear();
    const leave = await Leave.findOne({ 
      empId: empId, 
      year: currentYear, 
      leaveType: 'COFF' 
    });
    
    if (leave) {
      console.log(`\nCurrent COFF allocation:`);
      console.log(`  Allocated: ${leave.allocated}`);
      console.log(`  Used: ${leave.used}`);
      console.log(`  Balance: ${leave.balance}`);
      
      if (leave.allocated !== sundaysWorked) {
        console.log(`\n*** COFF allocation is INCORRECT! Should be ${sundaysWorked} ***`);
      } else {
        console.log(`\nCOFF allocation is correct`);
      }
      
      // Show monthly allocation details
      if (leave.monthlyAllocation && leave.monthlyAllocation.length > 0) {
        console.log(`\nMonthly COFF allocation:`);
        leave.monthlyAllocation.forEach(month => {
          if (month.allocated > 0) {
            console.log(`  Month ${month.month}: ${month.allocated} allocated`);
          }
        });
      }
    } else {
      console.log(`\nNo COFF record found for year ${currentYear}`);
    }
    
    // Show details of worked Sundays
    if (workedSundays.length > 0) {
      console.log(`\nWorked Sundays:`);
      workedSundays.forEach(sunday => {
        console.log(`  ${sunday.date} - Status: ${sunday.status}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking Sunday attendance:', error.message);
    process.exit(1);
  }
};

// Import Leave model after connecting to DB
let Leave;

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node check-sunday-attendance.js <empId> [year]');
    console.log('Example: node check-sunday-attendance.js A0000089 2025');
    process.exit(1);
  }
  
  const empId = args[0];
  const year = args.length > 1 ? parseInt(args[1]) : new Date().getFullYear();
  
  // Import Leave model after DB connection
  await connectDB();
  Leave = (await import('../models/leave.model.js')).Leave;
  
  await checkSundayAttendance(empId, year);
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('check-sunday-attendance.js')) {
  main().catch(error => {
    console.error('Error in check Sunday attendance script:', error);
    process.exit(1);
  });
}

export default checkSundayAttendance;