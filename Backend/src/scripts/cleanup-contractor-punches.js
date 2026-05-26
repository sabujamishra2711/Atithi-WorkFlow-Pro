import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

// Cleanup redundant ContractorPunch data (DEPRECATED - Use drop-contractor-punch-collection instead)
const cleanupContractorPunches = async () => {
  try {
    console.log('⚠️  WARNING: This script is deprecated. Use "npm run drop-contractor-punch-collection" instead.');
    console.log('⚠️  This script will be removed in a future version.');
    
    // Count documents before cleanup
    const punchCountBefore = await mongoose.connection.db.collection('contractorpunches').countDocuments();
    const sessionCountBefore = await mongoose.connection.db.collection('contractorsessions').countDocuments();
    
    console.log(`📊 Before cleanup:`);
    console.log(`   ContractorPunch documents: ${punchCountBefore}`);
    console.log(`   ContractorSession documents: ${sessionCountBefore}`);
    
    // Delete all ContractorPunch documents
    const deleteResult = await mongoose.connection.db.collection('contractorpunches').deleteMany({});
    
    // Count documents after cleanup
    const punchCountAfter = await mongoose.connection.db.collection('contractorpunches').countDocuments();
    const sessionCountAfter = await mongoose.connection.db.collection('contractorsessions').countDocuments();
    
    console.log(`\n🧹 Cleanup result:`);
    console.log(`   Deleted ${deleteResult.deletedCount} ContractorPunch documents`);
    console.log(`   ContractorPunch documents remaining: ${punchCountAfter}`);
    console.log(`   ContractorSession documents: ${sessionCountAfter}`);
    
    console.log(`\n✅ Cleanup completed successfully!`);
    console.log('ℹ️  Note: The ContractorPunch collection is no longer needed as all data is stored in ContractorSession.');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
};

// Run the cleanup
const runCleanup = async () => {
  await connectDB();
  await cleanupContractorPunches();
  process.exit(0);
};

runCleanup();