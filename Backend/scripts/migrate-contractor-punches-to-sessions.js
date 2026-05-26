import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import { ContractorSession } from '../src/models/contractorSession.model.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Migration function - This script is now obsolete since we've removed the Punch model
const migrateContractorPunchesToSessions = async () => {
  try {
    console.log('This migration script is obsolete since the Punch model has been removed.');
    console.log('All attendance tracking is now done through the ContractorSession model.');
  } catch (error) {
    console.error('Migration error:', error);
  }
};

// Run migration
const runMigration = async () => {
  await connectDB();
  await migrateContractorPunchesToSessions();
  await mongoose.connection.close();
  console.log('Migration script finished');
};

runMigration();

// Run migration if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export default migrateContractorPunchesToSessions;