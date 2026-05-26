import mongoose from 'mongoose';

const salaryHistorySchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    salary: {
        type: Number,
        required: true,
        min: 0
    },
    effectiveFrom: {
        type: Date,
        required: true
    },
    effectiveTo: {
        type: Date,
        default: null
    },
    source: {
        type: String,
        default: "manual"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient querying
salaryHistorySchema.index({ employee: 1, effectiveFrom: -1 });
salaryHistorySchema.index({ employee: 1, effectiveFrom: 1, effectiveTo: 1 });

export const SalaryHistory = mongoose.model('SalaryHistory', salaryHistorySchema);