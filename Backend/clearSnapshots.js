// Script to clear all payroll snapshots from the database
import mongoose from 'mongoose';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Clear all snapshots
async function clearSnapshots() {
    try {
        const result = await PayrollSnapshot.deleteMany({});
        console.log(`Deleted ${result.deletedCount} payroll snapshots`);
        process.exit(0);
    } catch (error) {
        console.error('Error clearing snapshots:', error);
        process.exit(1);
    }
}

clearSnapshots();