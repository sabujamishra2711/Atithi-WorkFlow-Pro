import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const getPaymentIdForFrontend = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Get the payment record
    const payment = await Payment.findOne();
    
    if (payment) {
      console.log(`export const PAYMENT_ID = '${payment._id}';`);
    } else {
      console.log('No payment record found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error getting payment record:', error);
    process.exit(1);
  }
};

getPaymentIdForFrontend();