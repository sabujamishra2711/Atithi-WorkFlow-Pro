import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Payment information
  date: {
    type: Date,
    required: true
  },
  // Version information
  version: {
    type: String,
    required: true
  },
  // Reminder configuration
  reminderDaysBefore: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

export const Payment = mongoose.model('Payment', paymentSchema);