import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';

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

// Fix employee ID format (convert 8-digit IDs to 7-digit)
const fixEmployeeIdFormat = async () => {
  try {
    await connectDB();
    
    // Find all users with 8-digit empIds
    const usersWith8DigitIds = await User.find({ empId: /^A\d{8}$/ });
    
    console.log(`Found ${usersWith8DigitIds.length} users with 8-digit empIds`);
    
    let fixedCount = 0;
    
    for (const user of usersWith8DigitIds) {
      const oldId = user.empId;
      // Extract numeric part and ensure it's 7 digits
      const numericPart = oldId.slice(1);
      // If it's an 8-digit number, we need to decide what to do
      // For now, we'll convert it to 7 digits by removing the first digit if it's a 1
      // This handles the case where A1000000 becomes A000000
      let newId;
      
      if (numericPart.startsWith('1') && numericPart.length === 8) {
        // Remove the leading 1 to convert A1xxxxxxx to Axxxxxx
        const shortened = numericPart.substring(1);
        newId = `A${shortened}`;
      } else if (numericPart.length === 8) {
        // For other 8-digit numbers, truncate to 7 digits
        const shortened = numericPart.substring(1);
        newId = `A${shortened}`;
      } else {
        // Already 7 digits or less, keep as is
        newId = oldId;
      }
      
      // Only update if the ID actually changed
      if (newId !== oldId) {
        // Check if the new ID already exists
        const existingUser = await User.findOne({ empId: newId });
        if (existingUser) {
          console.log(`⚠️  Skipping ${oldId} -> ${newId} because ${newId} already exists`);
          continue;
        }
        
        // Update the user's empId
        user.empId = newId;
        await user.save();
        console.log(`✅ Fixed ${oldId} -> ${newId}`);
        fixedCount++;
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} employee IDs`);
    
    // Verify the fix by showing current highest ID
    const lastUser = await User
      .findOne({ empId: /^A\d{7}$/ })
      .sort({ empId: -1 })
      .lean();
      
    if (lastUser) {
      console.log(`📈 Current highest empId: ${lastUser.empId}`);
    } else {
      console.log('📊 No 7-digit empIds found in database');
    }
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error fixing employee ID format:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

fixEmployeeIdFormat();