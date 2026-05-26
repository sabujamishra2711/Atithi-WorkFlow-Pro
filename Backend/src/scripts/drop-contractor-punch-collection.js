import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// Drop the ContractorPunch collection entirely
const dropContractorPunchCollection = async () => {
  try {
    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const contractorPunchCollectionExists = collections.some(collection => collection.name === 'contractorpunches');
    
    if (!contractorPunchCollectionExists) {
      console.log('✅ ContractorPunch collection does not exist, nothing to drop');
      return;
    }
    
    // Drop the ContractorPunch collection
    await mongoose.connection.db.dropCollection('contractorpunches');
    
    console.log('✅ ContractorPunch collection dropped successfully!');
    
    // Verify the collection is gone
    const collectionsAfter = await mongoose.connection.db.listCollections().toArray();
    const contractorPunchCollectionStillExists = collectionsAfter.some(collection => collection.name === 'contractorpunches');
    
    if (contractorPunchCollectionStillExists) {
      console.log('❌ Warning: ContractorPunch collection still exists after drop attempt');
    } else {
      console.log('✅ Verified: ContractorPunch collection no longer exists');
    }
  } catch (error) {
    console.error('❌ Failed to drop ContractorPunch collection:', error.message);
    process.exit(1);
  }
};

// Run the drop operation
const runDrop = async () => {
  await connectDB();
  await dropContractorPunchCollection();
  process.exit(0);
};

runDrop();