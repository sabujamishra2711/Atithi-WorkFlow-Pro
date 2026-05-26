/**
 * Database Connection Fixer and Tester
 * This script helps diagnose and fix MongoDB connection issues
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function testDatabaseConnection() {
    console.log('🔍 MongoDB Connection Diagnostics\n');
    
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   MONGODB_URI: ${MONGODB_URI ? '✅ Present' : '❌ Missing'}`);
    
    if (!MONGODB_URI) {
        console.log('❌ MONGODB_URI is not set in environment variables');
        return false;
    }

    // Parse the URI to show connection details
    try {
        const uri = new URL(MONGODB_URI.replace('mongodb+srv://', 'https://'));
        console.log(`   Database Host: ${uri.hostname}`);
        console.log(`   Database Name: ${MONGODB_URI.split('/').pop()}`);
        console.log(`   Connection Type: ${MONGODB_URI.includes('mongodb+srv') ? 'Atlas (Cloud)' : 'Local'}`);
    } catch (e) {
        console.log('   URI Format: Invalid format');
    }

    console.log('\n🔄 Testing Connection...');

    try {
        // Set connection options with timeouts
        const connectionOptions = {
            serverSelectionTimeoutMS: 15000, // 15 seconds
            connectTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000, // 45 seconds
        };

        const connectionInstance = await mongoose.connect(MONGODB_URI, connectionOptions);
        console.log(`✅ MongoDB Connected Successfully!`);
        console.log(`   Host: ${connectionInstance.connection.host}`);
        console.log(`   Database: ${connectionInstance.connection.name}`);
        console.log(`   Ready State: ${connectionInstance.connection.readyState}`);

        // Test basic operations
        console.log('\n🧪 Testing Database Operations...');
        
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`   Collections found: ${collections.length}`);
        
        if (collections.find(c => c.name === 'users')) {
            const usersCollection = db.collection('users');
            const userCount = await usersCollection.countDocuments({});
            console.log(`   Users in database: ${userCount}`);
            
            // Check mobile field status
            const usersWithMobile = await usersCollection.countDocuments({ 
                mobile: { $exists: true } 
            });
            const usersWithPopulatedMobile = await usersCollection.countDocuments({ 
                mobile: { $exists: true, $ne: null, $ne: "" } 
            });
            
            console.log(`   Users with mobile field: ${usersWithMobile}/${userCount}`);
            console.log(`   Users with populated mobile: ${usersWithPopulatedMobile}/${userCount}`);
            
            // Run migration if needed
            if (userCount > 0 && usersWithMobile < userCount) {
                console.log('\n🔄 Running mobile field migration...');
                await runMobileMigration(usersCollection);
            }
        } else {
            console.log('   No users collection found (new database)');
        }

        await mongoose.connection.close();
        console.log('\n✅ Connection test completed successfully!');
        return true;

    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        
        // Provide specific troubleshooting based on error type
        console.log('\n🛠️  Troubleshooting suggestions:');
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.log('   • Check your internet connection');
            console.log('   • Verify the MongoDB Atlas cluster hostname');
            console.log('   • Try connecting from a different network');
        }
        
        if (error.message.includes('Authentication failed')) {
            console.log('   • Check your MongoDB username and password');
            console.log('   • Verify database user permissions');
        }
        
        if (error.message.includes('timeout')) {
            console.log('   • Network connectivity issue or slow connection');
            console.log('   • Try increasing timeout values');
            console.log('   • Check firewall settings');
        }
        
        if (error.message.includes('IP whitelist')) {
            console.log('   • Add your IP address to MongoDB Atlas whitelist');
            console.log('   • Or allow access from anywhere (0.0.0.0/0) for testing');
        }

        return false;
    }
}

async function runMobileMigration(usersCollection) {
    try {
        // Add mobile field to all users who don't have it
        const addMobileResult = await usersCollection.updateMany(
            { mobile: { $exists: false } },
            { $set: { mobile: "" } }
        );
        console.log(`   ✅ Added mobile field to ${addMobileResult.modifiedCount} users`);

        // Copy phone data to mobile field where available
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
        console.log(`   ✅ Copied phone to mobile for ${copyPhoneResult.modifiedCount} users`);

        // Add other missing fields
        const addGenderResult = await usersCollection.updateMany(
            { gender: { $exists: false } },
            { $set: { gender: "" } }
        );
        console.log(`   ✅ Added gender field to ${addGenderResult.modifiedCount} users`);

        const addProfileImageUrlResult = await usersCollection.updateMany(
            { profileImageUrl: { $exists: false } },
            { $set: { profileImageUrl: "" } }
        );
        console.log(`   ✅ Added profileImageUrl field to ${addProfileImageUrlResult.modifiedCount} users`);

        console.log('   🎉 Migration completed successfully!');
    } catch (error) {
        console.log(`   ❌ Migration failed: ${error.message}`);
    }
}

// Alternative local database setup
function createLocalDatabaseOption() {
    console.log('\n🔄 Alternative: Local MongoDB Setup');
    console.log('If Atlas connection continues to fail, you can use local MongoDB:');
    console.log('');
    console.log('1. Download MongoDB Community Server:');
    console.log('   https://www.mongodb.com/try/download/community');
    console.log('');
    console.log('2. Install with default settings');
    console.log('');
    console.log('3. Update your .env file:');
    console.log('   MONGODB_URI=mongodb://localhost:27017/atithillp');
    console.log('');
    console.log('4. Restart the application');
}

// Main execution
async function main() {
    console.log('🚀 Starting Database Connection Diagnostics...\n');
    
    const success = await testDatabaseConnection();
    
    if (!success) {
        createLocalDatabaseOption();
    }
    
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { testDatabaseConnection, runMobileMigration };