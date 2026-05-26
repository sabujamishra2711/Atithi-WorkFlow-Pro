import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/atithillp');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// Fix salary history field names
const fixSalaryHistoryFields = async () => {
    try {
        await connectDB();

        // Get the collection directly
        const collection = mongoose.connection.collection('salaryhistories');

        // Find all salary history records that have the old field names
        const salaryHistoryRecords = await collection.find({
            $or: [
                { salaryAmount: { $exists: true } },
                { startMonth: { $exists: true } },
                { endMonth: { $exists: true } }
            ]
        }).toArray();

        console.log(`Found ${salaryHistoryRecords.length} salary history records with old field names`);

        let updatedCount = 0;

        for (const record of salaryHistoryRecords) {
            const updateObj = {};
            const unsetObj = {};

            // Map old field names to new field names
            if (record.salaryAmount !== undefined) {
                updateObj.salary = record.salaryAmount;
                unsetObj.salaryAmount = "";
                console.log(`Updating record ${record._id}: salaryAmount (${record.salaryAmount}) -> salary`);
            }

            if (record.startMonth !== undefined) {
                updateObj.effectiveFrom = record.startMonth;
                unsetObj.startMonth = "";
                console.log(`Updating record ${record._id}: startMonth (${record.startMonth}) -> effectiveFrom`);
            }

            if (record.endMonth !== undefined) {
                updateObj.effectiveTo = record.endMonth;
                unsetObj.endMonth = "";
                console.log(`Updating record ${record._id}: endMonth (${record.endMonth}) -> effectiveTo`);
            }

            // Only update if we have fields to update
            if (Object.keys(updateObj).length > 0) {
                await collection.updateOne({ _id: record._id }, { $set: updateObj, $unset: unsetObj });
                updatedCount++;
            }
        }

        console.log(`Updated ${updatedCount} salary history records`);

        // Verify the fix by checking a few records
        const verifiedRecords = await collection.find({ salary: { $exists: true } }).limit(5).toArray();
        console.log('\nVerification - Sample records with correct field names:');
        verifiedRecords.forEach((record, index) => {
            console.log(`${index + 1}. Employee: ${record.employee}, Salary: ${record.salary}, Effective From: ${record.effectiveFrom}, Effective To: ${record.effectiveTo}`);
        });

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error fixing salary history fields:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

fixSalaryHistoryFields();