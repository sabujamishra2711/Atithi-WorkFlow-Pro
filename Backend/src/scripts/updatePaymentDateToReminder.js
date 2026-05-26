import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const updatePaymentDateToReminder = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Find the existing payment record
    const existingRecord = await Payment.findOne();
    
    if (existingRecord) {
      // Update payment due date to 5 days from now to test reminder scenario
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 5);
      
      existingRecord.paymentDueDate = reminderDate;
      existingRecord.paymentStatus = 'pending';
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

updatePaymentDateToReminder();