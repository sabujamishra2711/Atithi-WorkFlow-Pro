import mongoose from 'mongoose';

const deductionSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 }, // 1-12
  year: { type: Number, required: true },
    type: { 
      type: String, 
      required: true,
      enum: ['Prof Tax/TDS', 'WF Fund', 'Adv/Loan', 'Canteen', 'Room Rent', 'PF', 'LOP', 'Incentive', 'Bonus', 'Other']
    },

  amount: { type: Number, required: true, min: 0 },
  notes: { type: String },
  isAutomatic: { type: Boolean, default: false }, // For automatic deductions like Prof Tax
}, {
  timestamps: true
});

deductionSchema.index({ employee: 1, month: 1, year: 1, type: 1 }, { unique: false });

export const Deduction = mongoose.model('Deduction', deductionSchema); 