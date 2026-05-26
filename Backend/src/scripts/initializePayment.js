import dotenv from 'dotenv';
import connectDB from '../db/index.js';
import { Payment } from '../models/payment.model.js';

// Load environment variables
dotenv.config({ path: './.env' });

const initializePaymentRecord = async () => {
  try {
    // Connect to database
    await connectDB();
    
    const appVersion = process.env.APP_VERSION || '1.0.0';
    
    // Check if a payment record already exists
    const existingRecord = await Payment.findOne();
    
    if (existingRecord) {
      console.log('Payment record already exists:');
      console.log(`- Date: ${existingRecord.date}`);
      console.log(`- Version: ${existingRecord.version}`);
      console.log(`- Reminder Days: ${existingRecord.reminderDaysBefore}`);
    } else {
      // Create initial payment record with date one year from now
      const dueDate = new Date();
      dueDate.setFullYear(dueDate.getFullYear() + 1);
      
      const paymentRecord = new Payment({
        date: dueDate,
        version: appVersion,
        reminderDaysBefore: 30
      });
      
      await paymentRecord.save();
      console.log('✅ Payment record created successfully:');
      console.log(`- Date: ${paymentRecord.date}`);
      console.log(`- Version: ${paymentRecord.version}`);
      console.log(`- Reminder Days: ${paymentRecord.reminderDaysBefore}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing payment record:', error);
    process.exit(1);
  }
};

initializePaymentRecord();