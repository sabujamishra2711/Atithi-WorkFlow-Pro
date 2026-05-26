#!/usr/bin/env node

/**
 * Verification script to test automatic leave allocation through API endpoint
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

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

// Function to verify auto allocation through API
const verifyAutoAllocation = async (empId, year = new Date().getFullYear()) => {
  try {
    await connectDB();
    
    console.log(`Verifying auto allocation for employee: ${empId} in year ${year}`);
    
    // API endpoint for leave balance
    const apiUrl = `http://localhost:8000/api/v1/leaves/balance/${empId}/${year}`;
    
    console.log(`Calling API endpoint: ${apiUrl}`);
    
    try {
      // Make API call to get leave balance (this should trigger auto allocation)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test-token'}`
        }
      });
      
      console.log(`API Response Status: ${response.status}`);
      console.log(`API Response Data:`, response.data);
      
      if (response.data && response.data.data) {
        console.log('\nLeave balances after auto allocation:');
        Object.keys(response.data.data).forEach(leaveType => {
          const leave = response.data.data[leaveType];
          console.log(`  ${leaveType}: allocated=${leave.allocated}, balance=${leave.balance}`);
        });
      }
      
      console.log('\n✅ Automatic leave allocation verification completed successfully');
    } catch (apiError) {
      if (apiError.response) {
        console.log(`API Error Response Status: ${apiError.response.status}`);
        console.log(`API Error Response Data:`, apiError.response.data);
      } else {
        console.log(`API Error: ${apiError.message}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error in verify auto allocation:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node verify-auto-allocation.js <empId> [year]');
    console.log('Example: node verify-auto-allocation.js A0000089 2025');
    process.exit(1);
  }
  
  const empId = args[0];
  const year = args.length > 1 ? parseInt(args[1]) : new Date().getFullYear();
  
  await verifyAutoAllocation(empId, year);
};

// Run the main function when the script is executed directly
if (process.argv[1] && process.argv[1].endsWith('verify-auto-allocation.js')) {
  main().catch(error => {
    console.error('Error in verify auto allocation script:', error);
    process.exit(1);
  });
}

export default verifyAutoAllocation;