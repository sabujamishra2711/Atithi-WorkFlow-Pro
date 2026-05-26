#!/usr/bin/env node

/**
 * Script to check employee type for COFF eligibility
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

// Function to check employee type
const checkEmployeeType = async (empId) => {
  try {
    await connectDB();
    
    console.log(`Checking employee type for: ${empId}`);
    
    const employee = await User.findOne({ empId });
    if (!employee) {
      console.log(`Employee not found: ${empId}`);
      return;
    }
    
    console.log(`Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`Employee ID: ${employee.empId}`);
    console.log(`Employee Type: ${employee.employeeType}`);
    console.log(`Weekly Off: ${employee.shiftDetails?.weeklyOff}`);
    
    // Check if eligible for COFF
    const isEligibleForCOFF = employee.employeeType === 'weeklyOffWithCoff';
    console.log(`Eligible for COFF: ${isEligibleForCOFF ? 'Yes' : 'No'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking employee type:', error.message);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node check-employee-type.js <empId>');
    console.log('Example: node check-employee-type.js A0000089');
    process.exit(1);
  }
  
  const empId = args[0];
  await checkEmployeeType(empId);
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('check-employee-type.js')) {
  main().catch(error => {
    console.error('Error in check employee type script:', error);
    process.exit(1);
  });
}

export default checkEmployeeType;