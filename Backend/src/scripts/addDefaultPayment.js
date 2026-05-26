import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const addDefaultPayment = async () => {
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
      // Create default payment record
      const defaultPayment = new Payment({
        date: new Date(),
        version: process.env.APP_VERSION || '1.0.0'
      });
      
      await defaultPayment.save();
      console.log('Default payment record created:', defaultPayment._id);
      console.log('Date:', defaultPayment.date);
      console.log('Version:', defaultPayment.version);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding default payment record:', error);
    process.exit(1);
  }
};

addDefaultPayment();