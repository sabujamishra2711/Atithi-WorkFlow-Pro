import mongoose from 'mongoose';

const paidHolidaySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  name: { type: String, required: true },
  year: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

paidHolidaySchema.index({ date: 1, year: 1 }, { unique: true });

export const PaidHoliday = mongoose.model('PaidHoliday', paidHolidaySchema); 