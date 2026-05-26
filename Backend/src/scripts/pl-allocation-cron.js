#!/usr/bin/env node

/**
 * Script to run annual PL allocation
 * This script should be scheduled to run on April 1st each year
 */

import mongoose from 'mongoose';
import { allocatePLForAllEmployees } from '../services/plAllocation.service.js';
import { config } from 'dotenv';

// Load environment variables
config();

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

// Run annual PL allocation
const runAnnualPLAllocation = async () => {
  try {
    await connectDB();
    
    // Get current year
    const date = new Date();
    const year = date.getFullYear();
    
    console.log(`Starting annual PL allocation for year ${year}...`);
    
    // Run PL allocation for all employees
    const allocationResults = await allocatePLForAllEmployees(year);
    
    console.log(`Annual PL allocation completed for year ${year}`);
    console.log(`Processed ${allocationResults.length} employees`);
    
    // Log summary
    const allocatedEmployees = allocationResults.filter(r => r.allocatedPL > 0);
    const skippedEmployees = allocationResults.filter(r => r.allocatedPL === 0);
    
    console.log(`Employees with PL allocated: ${allocatedEmployees.length}`);
    console.log(`Employees without PL allocated: ${skippedEmployees.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error in annual PL allocation:', error);
    process.exit(1);
  }
};

// Run the allocation if this script is executed directly
if (require.main === module) {
  runAnnualPLAllocation();
}

export default runAnnualPLAllocation;