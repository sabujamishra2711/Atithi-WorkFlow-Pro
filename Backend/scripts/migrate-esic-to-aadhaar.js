/**
 * Migration Script: Change ESIC No to Aadhaar No
 * This script updates all existing user records in the database
 * to rename the field from 'esicNo' to 'aadhaarNo'
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/atithi-workflow';

async function migrateESICToAadhaar() {
    try {
        console.log('🔄 Starting migration: ESIC No → Aadhaar No');
        console.log('📡 Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Get the users collection
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Check how many documents have esicNo field
        const documentsWithESIC = await usersCollection.countDocuments({ esicNo: { $exists: true } });
        console.log(`📊 Found ${documentsWithESIC} documents with 'esicNo' field`);

        if (documentsWithESIC === 0) {
            console.log('ℹ️  No documents found with esicNo field. Migration not needed.');
            return;
        }

        // Perform the migration
        console.log('🔄 Starting field migration...');
        
        // Update all documents: rename esicNo to aadhaarNo
        const result = await usersCollection.updateMany(
            { esicNo: { $exists: true } },
            { 
                $rename: { esicNo: 'aadhaarNo' }
            }
        );

        console.log(`✅ Migration completed successfully!`);
        console.log(`📈 Modified ${result.modifiedCount} documents`);
        console.log(`🔍 Matched ${result.matchedCount} documents`);

        // Verify the migration
        console.log('🔍 Verifying migration...');
        const documentsWithAadhaar = await usersCollection.countDocuments({ aadhaarNo: { $exists: true } });
        const remainingESIC = await usersCollection.countDocuments({ esicNo: { $exists: true } });
        
        console.log(`✅ Documents with 'aadhaarNo': ${documentsWithAadhaar}`);
        console.log(`❌ Remaining documents with 'esicNo': ${remainingESIC}`);

        if (remainingESIC === 0) {
            console.log('🎉 Migration verification successful! All esicNo fields have been renamed to aadhaarNo');
        } else {
            console.log('⚠️  Warning: Some documents still have esicNo field');
        }

        // Show sample of migrated data
        console.log('📋 Sample of migrated records:');
        const sampleRecords = await usersCollection.find(
            { aadhaarNo: { $exists: true } },
            { empId: 1, firstName: 1, lastName: 1, aadhaarNo: 1, _id: 0 }
        ).limit(5).toArray();

        sampleRecords.forEach((record, index) => {
            console.log(`   ${index + 1}. ${record.empId} - ${record.firstName} ${record.lastName} - Aadhaar: ${record.aadhaarNo || 'Not provided'}`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Close the connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateESICToAadhaar()
        .then(() => {
            console.log('🎉 Migration script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

export default migrateESICToAadhaar;