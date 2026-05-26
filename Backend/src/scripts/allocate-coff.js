#!/usr/bin/env node

/**
 * Script to allocate COFF (Compensatory Off) leaves for eligible employees
 * who have worked on Sundays
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';
import { Leave } from '../models/leave.model.js';
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

// Function to allocate COFF for an employee
const allocateCOFFForEmployee = async (employee, year = new Date().getFullYear()) => {
  try {
    console.log(`\nProcessing COFF for employee: ${employee.empId} (${employee.firstName} ${employee.lastName})`);
    
    // Check if employee is eligible for COFF
    if (employee.employeeType !== 'weeklyOffWithCoff') {
      console.log(`  Employee is not eligible for COFF (employeeType: ${employee.employeeType})`);
      return;
    }
    
    console.log(`  Employee is eligible for COFF`);
    
    // Get all Sundays in the year
    const sundays = getSundaysInYear(year);
    console.log(`  Total Sundays in ${year}: ${sundays.length}`);
    
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
        employeeId: employee.empId,
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
    
    console.log(`  Sundays worked: ${sundaysWorked}`);
    
    // Get or create COFF leave record
    let leave = await Leave.findOne({ 
      empId: employee.empId, 
      year: year, 
      leaveType: 'COFF' 
    });
    
    if (!leave) {
      leave = new Leave({
        employee: employee._id,
        empId: employee.empId,
        year: year,
        leaveType: 'COFF',
        allocated: 0,
        used: 0,
        balance: 0,
        monthlyAllocation: []
      });
    }
    
    // Initialize monthly allocation if needed
    if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
      leave.monthlyAllocation = [];
      // Initialize all 12 months
      for (let i = 0; i < 12; i++) {
        leave.monthlyAllocation.push({
          month: i + 1,
          allocated: 0,
          used: 0,
          balance: 0
        });
      }
    }
    
    // Reset all monthly allocations for COFF
    for (let i = 0; i < leave.monthlyAllocation.length; i++) {
      leave.monthlyAllocation[i].allocated = 0;
      leave.monthlyAllocation[i].balance = 0;
    }
    
    // Allocate COFF based on Sundays worked
    leave.allocated = sundaysWorked;
    leave.balance = sundaysWorked;
    leave.used = 0;
    
    // Distribute COFF allocations across months
    for (const sunday of workedSundays) {
      const sundayDate = new Date(sunday.date);
      const monthIndex = sundayDate.getMonth(); // 0-11
      if (monthIndex >= 0 && monthIndex < 12) {
        leave.monthlyAllocation[monthIndex].allocated += 1;
        leave.monthlyAllocation[monthIndex].balance += 1;
      }
    }
    
    await leave.save();
    
    console.log(`  COFF allocation updated: ${sundaysWorked} allocated`);
    
    // Show details of worked Sundays
    if (workedSundays.length > 0) {
      console.log(`  Worked Sundays:`);
      workedSundays.forEach(sunday => {
        console.log(`    ${sunday.date} - Status: ${sunday.status}`);
      });
    }
    
    return {
      empId: employee.empId,
      sundaysWorked,
      allocated: sundaysWorked
    };
  } catch (error) {
    console.error(`Error allocating COFF for employee ${employee.empId}:`, error.message);
    throw error;
  }
};

// Function to allocate COFF for all eligible employees
const allocateCOFFForAllEmployees = async (year = new Date().getFullYear()) => {
  try {
    await connectDB();
    
    console.log(`Allocating COFF for all eligible employees for year ${year}...`);
    
    // Get all active employees eligible for COFF
    const employees = await User.find({ 
      status: 'Active', 
      role: { $ne: 'ADMIN' },
      employeeType: 'weeklyOffWithCoff'
    });
    
    console.log(`Found ${employees.length} employees eligible for COFF`);
    
    const results = [];
    
    for (const employee of employees) {
      try {
        const result = await allocateCOFFForEmployee(employee, year);
        results.push(result);
      } catch (error) {
        console.error(`Error processing employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log(`\nCOFF allocation completed for ${results.length} employees`);
    
    // Show summary
    const totalSundaysWorked = results.reduce((sum, r) => sum + r.sundaysWorked, 0);
    const totalCOFFAllocated = results.reduce((sum, r) => sum + r.allocated, 0);
    
    console.log(`\nSummary:`);
    console.log(`  Total employees processed: ${results.length}`);
    console.log(`  Total Sundays worked: ${totalSundaysWorked}`);
    console.log(`  Total COFF allocated: ${totalCOFFAllocated}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error in COFF allocation:', error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  let year = new Date().getFullYear();
  
  // Check if year is provided as argument
  if (args.length > 0) {
    year = parseInt(args[0]);
    if (isNaN(year)) {
      console.log('Usage: node allocate-coff.js [year]');
      console.log('Example: node allocate-coff.js 2025');
      process.exit(1);
    }
  }
  
  await allocateCOFFForAllEmployees(year);
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('allocate-coff.js')) {
  main().catch(error => {
    console.error('Error in COFF allocation script:', error);
    process.exit(1);
  });
}

export default allocateCOFFForAllEmployees;