import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const updatePaymentRecord = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Find the existing payment record
    const existingRecord = await Payment.findOne();
    
    if (existingRecord) {
      // Explicitly set the reminderDaysBefore field
      existingRecord.set({ reminderDaysBefore: 30 });
      
      await existingRecord.save();
      
      console.log('✅ Payment record updated successfully:', existingRecord);
    } else {
      console.log('❌ No payment record found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating payment record:', error);
    process.exit(1);
  }
};

updatePaymentRecord();