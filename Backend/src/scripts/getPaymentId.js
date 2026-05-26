import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const getPaymentId = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Get the payment record
    const payment = await Payment.findOne();
    
    if (payment) {
      console.log('Payment ID:', payment._id);
      console.log('Date:', payment.date);
      console.log('Version:', payment.version);
    } else {
      console.log('No payment record found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error getting payment record:', error);
    process.exit(1);
  }
};

getPaymentId();