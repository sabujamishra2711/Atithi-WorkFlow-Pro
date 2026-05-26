import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const clearPaymentData = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Delete all payment records
    const result = await Payment.deleteMany({});
    
    console.log(`Deleted ${result.deletedCount} payment records`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing payment data:', error);
    process.exit(1);
  }
};

clearPaymentData();