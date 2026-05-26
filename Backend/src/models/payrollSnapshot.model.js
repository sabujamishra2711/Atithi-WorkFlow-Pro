import mongoose from 'mongoose';

const deductionSchema = new mongoose.Schema({
    name: String,
    amount: Number,
    type: String,
    description: String
}, { _id: false });

const payrollSnapshotSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    year: {
        type: Number,
        required: true,
        min: 2020,
        max: 2030
    },
    salarySnapshot: {
        monthlySalary: { type: Number, default: 0 },
        presentDays: { type: Number, default: 0 },
        lopDays: { type: Number, default: 0 },
        grossSalary: { type: Number, default: 0 },
        totalDeduction: { type: Number, default: 0 },
        netSalary: { type: Number, default: 0 },
        otHours: { type: Number, default: 0 },
        otSalary: { type: Number, default: 0 },
        deductions: {
            type: [deductionSchema],
            default: []
        }
    },
    meta: {
        generatedAt: { type: Date, default: Date.now }
    }
}, {
    timestamps: true
});

// Compound index for efficient querying
payrollSnapshotSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export const PayrollSnapshot = mongoose.model('PayrollSnapshot', payrollSnapshotSchema);