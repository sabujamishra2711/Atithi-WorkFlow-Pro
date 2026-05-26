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

// Check database structure directly
const checkDbStructure = async () => {
    try {
        await connectDB();

        // Get the collection directly
        const collection = mongoose.connection.collection('salaryhistories');

        // Get a sample of documents
        const sampleDocs = await collection.find().limit(5).toArray();

        console.log('Sample salary history documents from DB:');
        sampleDocs.forEach((doc, index) => {
            console.log(`\n--- Document ${index + 1} ---`);
            console.log(JSON.stringify(doc, null, 2));
        });

        // Check for documents with old field names
        const oldFieldDocs = await collection.find({
            $or: [
                { salaryAmount: { $exists: true } },
                { startMonth: { $exists: true } },
                { endMonth: { $exists: true } }
            ]
        }).limit(5).toArray();

        console.log(`\nDocuments with old field names: ${oldFieldDocs.length}`);
        oldFieldDocs.forEach((doc, index) => {
            console.log(`\n--- Old Field Doc ${index + 1} ---`);
            console.log(JSON.stringify(doc, null, 2));
        });

        // Check for documents with new field names
        const newFieldDocs = await collection.find({
            $or: [
                { salary: { $exists: true } },
                { effectiveFrom: { $exists: true } },
                { effectiveTo: { $exists: true } }
            ]
        }).limit(5).toArray();

        console.log(`\nDocuments with new field names: ${newFieldDocs.length}`);
        newFieldDocs.forEach((doc, index) => {
            console.log(`\n--- New Field Doc ${index + 1} ---`);
            console.log(JSON.stringify(doc, null, 2));
        });

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('Error checking DB structure:', error);
        mongoose.connection.close();
        process.exit(1);
    }
};

checkDbStructure();