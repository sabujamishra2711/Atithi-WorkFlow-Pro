import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { SalaryHistory } from '../models/salaryHistory.model.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/atithillp';

async function initializeSalaryHistory() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Find all users with monthlySalary
        const users = await User.find({
            monthlySalary: { $exists: true, $ne: null, $gt: 0 }
        }).select('_id empId monthlySalary createdAt joiningDate');

        console.log(`Found ${users.length} users with monthlySalary`);

        let initializedCount = 0;

        for (const user of users) {
            // Check if salary history already exists for this user
            const existingHistory = await SalaryHistory.findOne({ employee: user._id });

            if (!existingHistory) {
                // Determine effective from date
                const effectiveFromDate = user.joiningDate || user.createdAt || new Date();

                // Create salary history record
                await SalaryHistory.create({
                    employee: user._id,
                    salary: user.monthlySalary,
                    effectiveFrom: effectiveFromDate,
                    source: "migration"
                });

                console.log(`Initialized salary history for user ${user.empId}`);
                initializedCount++;
            } else {
                console.log(`Salary history already exists for user ${user.empId}`);
            }
        }

        console.log(`Successfully initialized salary history for ${initializedCount} users`);
        console.log('Migration completed successfully');

        // Close the connection
        await mongoose.connection.close();
        console.log('Disconnected from MongoDB');

    } catch (error) {
        console.error('Error during salary history initialization:', error);
        process.exit(1);
    }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    initializeSalaryHistory();
}

export default initializeSalaryHistory;