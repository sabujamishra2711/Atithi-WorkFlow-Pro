import { Payment } from '../models/payment.model.js';

class PaymentService {
  // Check if the current version matches the database version
  async checkVersion(currentVersion) {
    try {
      const paymentRecord = await Payment.findOne().sort({ createdAt: -1 });
      
      if (!paymentRecord) {
        // If no payment record exists, create one with current version
        const newPaymentRecord = new Payment({
          date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
          version: currentVersion,
          reminderDaysBefore: 30
        });
        await newPaymentRecord.save();
        return { versionMatch: true, message: 'New installation, version record created' };
      }
      
      const versionMatch = paymentRecord.version === currentVersion;
      return { 
        versionMatch, 
        dbVersion: paymentRecord.version, 
        appVersion: currentVersion,
        message: versionMatch ? 'Versions match' : 'Version mismatch detected' 
      };
    } catch (error) {
      console.error('Error checking version:', error);
      return { versionMatch: false, error: error.message };
    }
  }
  
  // Check payment status
  async checkPaymentStatus() {
    try {
      const paymentRecord = await Payment.findOne().sort({ createdAt: -1 });
      
      if (!paymentRecord) {
        return { 
          status: 'unknown', 
          message: 'No payment record found' 
        };
      }
      
      const today = new Date();
      const dueDate = new Date(paymentRecord.date);
      
      // Check if payment is overdue
      if (today > dueDate) {
        return { 
          status: 'overdue', 
          dueDate: paymentRecord.date,
          daysOverdue: Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)),
          message: 'Payment is overdue' 
        };
      }
      
      // Check if we're within the reminder period
      // Use default value of 30 days if reminderDaysBefore is undefined
      const reminderDays = paymentRecord.reminderDaysBefore !== undefined ? 
                          paymentRecord.reminderDaysBefore : 30;
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);
      
      if (today >= reminderDate) {
        const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return { 
          status: 'reminder', 
          dueDate: paymentRecord.date,
          daysRemaining,
          message: `Payment due in ${daysRemaining} days` 
        };
      }
      
      return { 
        status: 'current', 
        dueDate: paymentRecord.date,
        message: 'Payment is current' 
      };
    } catch (error) {
      console.error('Error checking payment status:', error);
      return { status: 'error', error: error.message };
    }
  }
  
  // Update payment information
  async updatePaymentInfo(paymentData) {
    try {
      const paymentRecord = await Payment.findOne().sort({ createdAt: -1 });
      
      if (!paymentRecord) {
        // Create new payment record
        const newPaymentRecord = new Payment(paymentData);
        return await newPaymentRecord.save();
      }
      
      // Update existing record
      Object.assign(paymentRecord, paymentData);
      paymentRecord.lastChecked = new Date();
      return await paymentRecord.save();
    } catch (error) {
      console.error('Error updating payment info:', error);
      throw error;
    }
  }
}

export default new PaymentService();