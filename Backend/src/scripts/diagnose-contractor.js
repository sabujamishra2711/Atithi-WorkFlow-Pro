import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Contractor from '../models/contractor.model.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Diagnostic function to check contractor by employee ID
const diagnoseContractorById = async (employeeId) => {
  try {
    console.log(`Searching for contractor with employee ID: ${employeeId}`);
    
    // Find contractor that has this employee ID in their contractorIds array
    const contractor = await Contractor.findOne({
      contractorIds: employeeId
    });
    
    if (!contractor) {
      console.log(`❌ No contractor found with employee ID: ${employeeId}`);
      return;
    }
    
    console.log(`✅ Contractor found:`);
    console.log(`  ID: ${contractor._id}`);
    console.log(`  Name: ${contractor.name}`);
    console.log(`  Contractor No: ${contractor.contractorNo}`);
    console.log(`  Status: ${contractor.status}`);
    console.log(`  Contractor IDs: ${contractor.contractorIds.join(', ')}`);
    
    // Check if the specific ID is in the array
    if (contractor.contractorIds.includes(employeeId)) {
      console.log(`✅ Employee ID ${employeeId} is valid for this contractor`);
    } else {
      console.log(`❌ Employee ID ${employeeId} is NOT in contractor's ID list`);
    }
    
    // Check if contractor is active
    if (contractor.status === 'Active') {
      console.log(`✅ Contractor is Active`);
    } else {
      console.log(`❌ Contractor is ${contractor.status}`);
    }
    
  } catch (error) {
    console.error(`Error diagnosing contractor: ${error.message}`);
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  // Get employee ID from command line arguments
  const employeeId = process.argv[2];
  
  if (!employeeId) {
    console.log('Usage: node diagnose-contractor.js <employeeId>');
    console.log('Example: node diagnose-contractor.js SS3D3TAL');
    process.exit(1);
  }
  
  await diagnoseContractorById(employeeId);
  
  // Close the connection
  mongoose.connection.close();
};

main();