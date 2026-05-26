import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const updatePaymentDate = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Find the existing payment record
    const existingRecord = await Payment.findOne();
    
    if (existingRecord) {
      // Update payment due date to a past date to test overdue scenario
      existingRecord.paymentDueDate = new Date('2020-01-01');
      existingRecord.paymentStatus = 'overdue';
      await existingRecord.save();
      
      console.log('✅ Payment due date updated successfully:', existingRecord);
    } else {
      console.log('❌ No payment record found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating payment due date:', error);
    process.exit(1);
  }
};

updatePaymentDate();