import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const initPayment = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Check if payment record already exists
    const existingPayment = await Payment.findOne();
    
    if (existingPayment) {
      console.log('Payment record already exists:', existingPayment._id);
      console.log('Date:', existingPayment.date);
      console.log('Version:', existingPayment.version);
    } else {
      console.log('No payment record found in database');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking payment record:', error);
    process.exit(1);
  }
};

initPayment();