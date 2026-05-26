#!/usr/bin/env node

/**
 * Script to automate leave policy allocation according to company rules
 * 
 * PL (Paid Leave) Rules:
 * - Allocated when employee has 20+ present days
 * - Maximum 12 PL per year
 * - Requires 240+ working days for full allocation
 * - Reserved for next year if criteria met
 * - Valid for up to 3 years
 * - Can carry forward remaining balance
 * - Maximum carry forward: 36 days (3 years)
 * - If 240 working days not achieved, reserved PL lapses
 * - PL is paid leave with full salary
 * - Allocation starts from April 1st
 * 
 * CL (Casual Leave) Rules:
 * - Fixed 6 CL per year
 * - 1 leave allocated per month
 * - Automatic monthly allocation
 * - No carry forward to next year
 * - Valid for 1 year
 * - Lapses after 1 year
 * - New allocation every month
 * - CL is paid leave
 * - Cannot be accumulated beyond 6 months
 * 
 * SL (Sick Leave) Rules:
 * - Fixed 6 SL per year
 * - 1 leave allocated per month
 * - Automatic monthly allocation
 * - No carry forward to next year
 * - Valid for 1 year
 * - Lapses after 1 year
 * - New allocation every month
 * - SL is paid leave
 * - Requires medical certificate for extended periods
 * - Cannot be accumulated beyond 6 months
 * 
 * LWP (Leave Without Pay) Rules:
 * - Same allocation rules as PL
 * - Allocated when employee has 20+ present days
 * - Maximum 12 LWP per year
 * - Requires 240+ working days for full allocation
 * - Valid for up to 3 years
 * - Can carry forward remaining balance
 * - Maximum carry forward: 36 days (3 years)
 * - LWP is unpaid leave
 * - No salary during LWP period
 * - Requires prior approval
 * - Same carry forward rules as PL
 */

import mongoose from 'mongoose';
import cron from 'node-cron';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';
import { Leave } from '../models/leave.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { allocateMonthlyLeaves, processYearEnd } from '../services/leaveAllocation.service.js';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    // Don't exit if we're imported as a module
    if (process.argv[1] && process.argv[1].endsWith('leave-policy-automation.js')) {
      process.exit(1);
    }
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

// Function to allocate CL and SL monthly (1 per month)
const allocateMonthlyCLSL = async () => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    
    console.log(`Allocating CL/SL for ${currentMonth}/${currentYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    for (const employee of employees) {
      try {
        // Allocate CL (1 per month, max 6 per year)
        await allocateLeaveType(employee.empId, currentYear, 'CL', 1);
        
        // Allocate SL (1 per month, max 6 per year)
        await allocateLeaveType(employee.empId, currentYear, 'SL', 1);
        
        console.log(`Allocated CL/SL for employee ${employee.empId}`);
      } catch (error) {
        console.error(`Error allocating CL/SL for employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log('Monthly CL/SL allocation completed');
  } catch (error) {
    console.error('Error in monthly CL/SL allocation:', error.message);
  }
};

// Function to allocate COFF for eligible employees
const allocateCOFF = async (year = new Date().getFullYear()) => {
  try {
    console.log(`Allocating COFF for eligible employees for year ${year}...`);
    
    // Get all active employees eligible for COFF
    const employees = await User.find({ 
      status: 'Active', 
      role: { $ne: 'ADMIN' },
      employeeType: 'weeklyOffWithCoff'
    });
    
    console.log(`Found ${employees.length} employees eligible for COFF`);
    
    if (employees.length === 0) {
      console.log('No employees eligible for COFF allocation');
      return;
    }
    
    let totalSundaysWorked = 0;
    let totalCOFFAllocated = 0;
    
    for (const employee of employees) {
      try {
        // Get all Sundays in the year
        const sundays = getSundaysInYear(year);
        
        // Check attendance for each Sunday
        let sundaysWorked = 0;
        
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
          }
        }
        
        // Only update leave record if there are Sundays worked
        if (sundaysWorked > 0) {
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
              const monthIndex = sundayStart.getMonth(); // 0-11
              if (monthIndex >= 0 && monthIndex < 12) {
                leave.monthlyAllocation[monthIndex].allocated += 1;
                leave.monthlyAllocation[monthIndex].balance += 1;
              }
            }
          }
          
          await leave.save();
          
          totalSundaysWorked += sundaysWorked;
          totalCOFFAllocated += sundaysWorked;
          
          console.log(`Allocated ${sundaysWorked} COFF for employee ${employee.empId}`);
        } else {
          console.log(`No Sundays worked for employee ${employee.empId}`);
        }
      } catch (error) {
        console.error(`Error allocating COFF for employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log(`COFF allocation completed. Total Sundays worked: ${totalSundaysWorked}, Total COFF allocated: ${totalCOFFAllocated}`);
  } catch (error) {
    console.error('Error in COFF allocation:', error.message);
  }
};

// Function to allocate PL and LWP annually (April 1st)
const allocateAnnualPLLPW = async () => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // For PL/LWP allocation, we calculate based on previous year's attendance
    // (April to March period)
    const calculationYear = currentDate.getMonth() < 3 ? currentYear - 1 : currentYear;
    
    console.log(`Allocating PL/LWP for year ${calculationYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    for (const employee of employees) {
      try {
        // Calculate attendance for the April-March period
        const presentDays = await calculatePresentDays(employee.empId, calculationYear);
        
        // Allocate PL if criteria met
        if (presentDays >= 240) {
          await allocateLeaveType(employee.empId, currentYear, 'PL', 12);
          console.log(`Allocated 12 PL for employee ${employee.empId}`);
        } else if (presentDays >= 20) {
          // Allocate proportional PL based on present days
          const plAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
          await allocateLeaveType(employee.empId, currentYear, 'PL', plAllocation);
          console.log(`Allocated ${plAllocation} PL for employee ${employee.empId}`);
        }
        
        // Allocate LWP (same rules as PL)
        if (presentDays >= 240) {
          await allocateLeaveType(employee.empId, currentYear, 'LWP', 12);
          console.log(`Allocated 12 LWP for employee ${employee.empId}`);
        } else if (presentDays >= 20) {
          // Allocate proportional LWP based on present days
          const lwpAllocation = Math.min(Math.floor((presentDays / 240) * 12), 12);
          await allocateLeaveType(employee.empId, currentYear, 'LWP', lwpAllocation);
          console.log(`Allocated ${lwpAllocation} LWP for employee ${employee.empId}`);
        }
        
      } catch (error) {
        console.error(`Error allocating PL/LWP for employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log('Annual PL/LWP allocation completed');
  } catch (error) {
    console.error('Error in annual PL/LWP allocation:', error.message);
  }
};

// Function to carry forward PL and LWP at year end
const carryForwardLeaves = async () => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const previousYear = currentYear - 1;
    
    console.log(`Processing carry forward for leaves from ${previousYear} to ${currentYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    for (const employee of employees) {
      try {
        // Process PL carry forward
        await processCarryForward(employee.empId, previousYear, 'PL');
        
        // Process LWP carry forward
        await processCarryForward(employee.empId, previousYear, 'LWP');
        
        console.log(`Processed carry forward for employee ${employee.empId}`);
      } catch (error) {
        console.error(`Error processing carry forward for employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log('Carry forward processing completed');
  } catch (error) {
    console.error('Error in carry forward processing:', error.message);
  }
};

// Function to expire CL and SL at year end
const expireAnnualLeaves = async () => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    console.log(`Expiring CL/SL for year ${currentYear}...`);
    
    // Get all active employees
    const employees = await User.find({ status: 'Active', role: { $ne: 'ADMIN' } });
    
    for (const employee of employees) {
      try {
        // Expire CL
        await expireLeaveType(employee.empId, currentYear, 'CL');
        
        // Expire SL
        await expireLeaveType(employee.empId, currentYear, 'SL');
        
        console.log(`Expired CL/SL for employee ${employee.empId}`);
      } catch (error) {
        console.error(`Error expiring CL/SL for employee ${employee.empId}:`, error.message);
      }
    }
    
    console.log('Annual leave expiration completed');
  } catch (error) {
    console.error('Error in annual leave expiration:', error.message);
  }
};

// Helper function to allocate a specific leave type
const allocateLeaveType = async (empId, year, leaveType, count) => {
  try {
    // Get or create leave record
    let leave = await Leave.findOne({ empId, year, leaveType });
    
    if (!leave) {
      const employee = await User.findOne({ empId });
      if (!employee) throw new Error(`Employee not found: ${empId}`);
      
      leave = new Leave({
        employee: employee._id,
        empId,
        year,
        leaveType,
        allocated: 0,
        used: 0,
        balance: 0
      });
    }
    
    // For monthly leaves (CL/SL), track monthly allocation
    if (leaveType === 'CL' || leaveType === 'SL') {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      
      // Initialize monthly allocation if needed
      if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
        leave.monthlyAllocation = [];
      }
      
      // Find or create monthly record
      let monthlyRecord = leave.monthlyAllocation.find(m => m.month === currentMonth);
      if (!monthlyRecord) {
        monthlyRecord = {
          month: currentMonth,
          allocated: 0,
          used: 0,
          balance: 0
        };
        leave.monthlyAllocation.push(monthlyRecord);
      }
      
      // Allocate if not already allocated for this month
      if (monthlyRecord.allocated === 0) {
        monthlyRecord.allocated = count;
        monthlyRecord.balance = count;
        
        // Update total allocation (max 6 for CL/SL)
        leave.allocated = Math.min(6, leave.allocated + count);
        leave.balance = leave.monthlyAllocation.reduce((sum, m) => sum + m.balance, 0);
        
        await leave.save();
      }
    } 
    // For annual leaves (PL/LWP), allocate directly
    else if (leaveType === 'PL' || leaveType === 'LWP') {
      // Only allocate if not already allocated for this year
      if (leave.allocated === 0) {
        leave.allocated = count;
        leave.balance = count;
        await leave.save();
      }
    }
  } catch (error) {
    console.error(`Error allocating ${leaveType} for ${empId}:`, error.message);
    throw error;
  }
};

// Helper function to calculate present days for an employee
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

// Helper function to process carry forward
const processCarryForward = async (empId, year, leaveType) => {
  try {
    const leave = await Leave.findOne({ empId, year, leaveType });
    
    if (leave && leave.balance > 0) {
      // Get next year's leave record
      const nextYear = year + 1;
      let nextYearLeave = await Leave.findOne({ empId, year: nextYear, leaveType });
      
      if (!nextYearLeave) {
        const employee = await User.findOne({ empId });
        if (!employee) throw new Error(`Employee not found: ${empId}`);
        
        nextYearLeave = new Leave({
          employee: employee._id,
          empId,
          year: nextYear,
          leaveType,
          allocated: 0,
          used: 0,
          balance: 0,
          carriedForward: 0
        });
      }
      
      // Carry forward balance (max 36 for PL/LWP)
      const carryForwardAmount = Math.min(leave.balance, 36);
      nextYearLeave.carriedForward = carryForwardAmount;
      await nextYearLeave.save();
      
      // Reset current year balance
      leave.balance = 0;
      await leave.save();
    }
  } catch (error) {
    console.error(`Error processing carry forward for ${empId} ${leaveType}:`, error.message);
    throw error;
  }
};

// Helper function to expire leave types
const expireLeaveType = async (empId, year, leaveType) => {
  try {
    const leave = await Leave.findOne({ empId, year, leaveType });
    
    if (leave) {
      // Expire all leaves by resetting balance to 0
      // This is done at the beginning of a new year
      leave.balance = 0;
      leave.monthlyAllocation = leave.monthlyAllocation.map(m => ({
        ...m,
        balance: 0
      }));
      await leave.save();
    }
  } catch (error) {
    console.error(`Error expiring ${leaveType} for ${empId}:`, error.message);
    throw error;
  }
};

// Schedule cron jobs
const scheduleJobs = () => {
  // Monthly job on the 1st day of every month at 2:00 AM
  cron.schedule('0 2 1 * *', async () => {
    console.log('Running monthly leave allocation...');
    await allocateMonthlyCLSL();
    // Also allocate COFF monthly to ensure up-to-date allocation
    await allocateCOFF();
  });
  
  // Annual job on April 1st at 3:00 AM
  cron.schedule('0 3 1 4 *', async () => {
    console.log('Running annual PL/LWP allocation...');
    await allocateAnnualPLLPW();
  });
  
  // Year-end job on December 31st at 1:00 AM
  cron.schedule('0 1 31 12 *', async () => {
    console.log('Running year-end carry forward and expiration...');
    await carryForwardLeaves();
    await expireAnnualLeaves();
  });
  
  console.log('Leave policy automation jobs scheduled');
};

// Run jobs manually (for testing)
const runJobsManually = async () => {
  console.log('Running leave policy automation jobs manually...');
  
  // Connect to database
  await connectDB();
  
  // Run all jobs
  await allocateMonthlyCLSL();
  await allocateAnnualPLLPW();
  await allocateCOFF();
  await carryForwardLeaves();
  await expireAnnualLeaves();
  
  console.log('All leave policy automation jobs completed');
  process.exit(0);
};

// Main function
const main = async () => {
  // Connect to database
  await connectDB();
  
  // Check if running in manual mode
  if (process.argv.includes('--manual')) {
    await runJobsManually();
  } else {
    // Schedule jobs
    scheduleJobs();
    console.log('Leave policy automation system started');
  }
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('leave-policy-automation.js')) {
  main().catch(error => {
    console.error('Error in leave policy automation:', error);
    process.exit(1);
  });
}

export { allocateCOFF };
export default main;