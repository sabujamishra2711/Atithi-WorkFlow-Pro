import mongoose from 'mongoose';
import { PayrollSnapshot } from './src/models/payrollSnapshot.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/workflowpro')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

async function checkSnapshots() {
    try {
        // Check a few snapshots to see their structure
        const snapshots = await PayrollSnapshot.find().limit(5);

        console.log('Sample snapshots:');
        snapshots.forEach((snapshot, index) => {
            console.log(`\n--- Snapshot ${index + 1} ---`);
            console.log(`Employee: ${snapshot.employee}`);
            console.log(`Month: ${snapshot.month}`);
            console.log(`Year: ${snapshot.year}`);
            console.log(`Total Deduction: ${snapshot.salarySnapshot.totalDeduction}`);
            console.log(`Deductions Array:`, snapshot.salarySnapshot.deductions);
            console.log(`Deductions Type:`, typeof snapshot.salarySnapshot.deductions);
            console.log(`Deductions Is Array:`, Array.isArray(snapshot.salarySnapshot.deductions));
        });

        // Check specifically for snapshots with deductions
        const snapshotsWithDeductions = await PayrollSnapshot.find({
            'salarySnapshot.deductions.0': { $exists: true }
        }).limit(3);

        console.log('\n\nSnapshots with deductions:');
        snapshotsWithDeductions.forEach((snapshot, index) => {
            console.log(`\n--- Snapshot with Deductions ${index + 1} ---`);
            console.log(`Employee: ${snapshot.employee}`);
            console.log(`Month: ${snapshot.month}`);
            console.log(`Year: ${snapshot.year}`);
            console.log(`Total Deduction: ${snapshot.salarySnapshot.totalDeduction}`);
            console.log(`Deductions:`, JSON.stringify(snapshot.salarySnapshot.deductions, null, 2));
        });

        process.exit(0);
    } catch (error) {
        console.error('Error checking snapshots:', error);
        process.exit(1);
    }
}

checkSnapshots();