/**
 * Migration Script: Add mobile field to existing employees
 * This script updates all existing user records in the database
 * to add the 'mobile' field and populate it with 'phone' data where available
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/atithillp';

async function migratePhoneToMobile() {
    try {
        console.log('🔄 Starting migration: Add mobile field to existing employees');
        console.log('📡 Connecting to MongoDB...');
        
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB successfully');

        // Get the users collection
        const db = mongoose.connection.db;
        const usersCollection = db.collection('users');

        // Check how many documents don't have mobile field
        const documentsWithoutMobile = await usersCollection.countDocuments({ 
            mobile: { $exists: false } 
        });
        console.log(`📊 Found ${documentsWithoutMobile} documents without 'mobile' field`);

        // Check how many documents have phone field
        const documentsWithPhone = await usersCollection.countDocuments({ 
            phone: { $exists: true, $ne: null, $ne: "" } 
        });
        console.log(`📊 Found ${documentsWithPhone} documents with 'phone' field`);

        if (documentsWithoutMobile === 0) {
            console.log('ℹ️  All documents already have mobile field. Migration not needed.');
            return;
        }

        // Step 1: Add mobile field to all documents that don't have it
        console.log('🔄 Step 1: Adding mobile field to all documents...');
        const addMobileResult = await usersCollection.updateMany(
            { mobile: { $exists: false } },
            { $set: { mobile: "" } }
        );
        console.log(`✅ Added mobile field to ${addMobileResult.modifiedCount} documents`);

        // Step 2: Copy phone data to mobile field where phone exists and mobile is empty
        console.log('🔄 Step 2: Copying phone data to mobile field...');
        const copyPhoneResult = await usersCollection.updateMany(
            { 
                phone: { $exists: true, $ne: null, $ne: "" },
                $or: [
                    { mobile: { $exists: false } },
                    { mobile: "" },
                    { mobile: null }
                ]
            },
            [
                {
                    $set: {
                        mobile: "$phone"
                    }
                }
            ]
        );
        console.log(`✅ Copied phone data to mobile field for ${copyPhoneResult.modifiedCount} documents`);

        // Step 3: Add gender field for any missing
        console.log('🔄 Step 3: Adding gender field to documents without it...');
        const addGenderResult = await usersCollection.updateMany(
            { gender: { $exists: false } },
            { $set: { gender: "" } }
        );
        console.log(`✅ Added gender field to ${addGenderResult.modifiedCount} documents`);

        // Step 4: Add profileImageUrl field for any missing
        console.log('🔄 Step 4: Adding profileImageUrl field to documents without it...');
        const addProfileImageUrlResult = await usersCollection.updateMany(
            { profileImageUrl: { $exists: false } },
            { $set: { profileImageUrl: "" } }
        );
        console.log(`✅ Added profileImageUrl field to ${addProfileImageUrlResult.modifiedCount} documents`);

        // Step 5: Update languages schema to include canSpeak field
        console.log('🔄 Step 5: Adding canSpeak field to languages array...');
        const updateLanguagesResult = await usersCollection.updateMany(
            { 
                languages: { 
                    $exists: true,
                    $elemMatch: { canSpeak: { $exists: false } }
                }
            },
            {
                $set: {
                    "languages.$[element].canSpeak": false
                }
            },
            {
                arrayFilters: [{ "element.canSpeak": { $exists: false } }]
            }
        );
        console.log(`✅ Updated languages with canSpeak field for ${updateLanguagesResult.modifiedCount} documents`);

        // Verification: Check results
        console.log('\n📋 Migration Verification:');
        const finalCount = await usersCollection.countDocuments({ mobile: { $exists: true } });
        const totalUsers = await usersCollection.countDocuments({});
        console.log(`✅ Total users with mobile field: ${finalCount}/${totalUsers}`);

        const populatedMobile = await usersCollection.countDocuments({ 
            mobile: { $exists: true, $ne: null, $ne: "" } 
        });
        console.log(`✅ Users with populated mobile field: ${populatedMobile}/${totalUsers}`);

        // Show sample of migrated data
        console.log('\n📋 Sample of migrated data:');
        const samples = await usersCollection.find(
            { mobile: { $exists: true, $ne: null, $ne: "" } },
            { empId: 1, firstName: 1, lastName: 1, phone: 1, mobile: 1, _id: 0 }
        ).limit(3).toArray();
        
        samples.forEach((sample, index) => {
            console.log(`   ${index + 1}. ${sample.empId} - ${sample.firstName} ${sample.lastName}`);
            console.log(`      Phone: ${sample.phone || 'N/A'}, Mobile: ${sample.mobile || 'N/A'}`);
        });

        console.log('\n🎉 Migration completed successfully!');
        console.log('💡 Recommendations:');
        console.log('   1. Test the application to ensure mobile fields are working');
        console.log('   2. Check PDF generation to verify mobile numbers appear correctly');
        console.log('   3. Verify profile editing functionality for mobile field updates');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('📡 Database connection closed');
        }
    }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
    migratePhoneToMobile()
        .then(() => {
            console.log('✨ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

export default migratePhoneToMobile;