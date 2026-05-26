import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const checkPaymentRecord = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Check the current payment record
    const record = await Payment.findOne();
    
    console.log('Current payment record:', record);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking payment record:', error);
    process.exit(1);
  }
};

checkPaymentRecord();