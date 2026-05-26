import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/user.model.js';
import { Counter } from '../models/user.model.js';

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

// Reset employee ID sequence to ensure proper continuity
const resetEmployeeIdSequence = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Analyzing current employee IDs...');
    
    // Find all users with valid empIds
    const users = await User.find({ empId: /^A\d{7,8}$/ }).sort({ empId: 1 });
    
    console.log(`📊 Found ${users.length} employees with valid empIds`);
    
    if (users.length === 0) {
      console.log('✅ No employees found. Sequence will start from A0000001');
      // Initialize counter to 0 so next ID will be A0000001
      await Counter.findByIdAndUpdate(
        { _id: 'empId' },
        { seq: 0 },
        { upsert: true, new: true }
      );
      console.log('🔄 Counter initialized to 0');
      mongoose.connection.close();
      process.exit(0);
      return;
    }
    
    // Find the highest numeric value
    let maxSeq = 0;
    const idMap = new Map();
    
    for (const user of users) {
      const numericPart = parseInt(user.empId.slice(1));
      if (!isNaN(numericPart)) {
        maxSeq = Math.max(maxSeq, numericPart);
        idMap.set(numericPart, user.empId);
      }
    }
    
    console.log(`📈 Highest numeric sequence found: ${maxSeq}`);
    console.log(`🆔 Highest empId: ${idMap.get(maxSeq) || 'Unknown'}`);
    
    // Check for gaps in the sequence
    const existingIds = Array.from(idMap.keys()).sort((a, b) => a - b);
    const gaps = [];
    
    for (let i = 1; i < existingIds.length; i++) {
      const prev = existingIds[i-1];
      const current = existingIds[i];
      if (current - prev > 1) {
        for (let j = prev + 1; j < current; j++) {
          gaps.push(j);
        }
      }
    }
    
    if (gaps.length > 0) {
      console.log(`⚠️  Found ${gaps.length} gaps in the sequence`);
      console.log(`   First few gaps: ${gaps.slice(0, 10).join(', ')}`);
    } else {
      console.log('✅ No gaps found in the sequence');
    }
    
    // Set the counter to the highest sequence number
    // This ensures the next ID will be maxSeq + 1
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'empId' },
      { seq: maxSeq },
      { upsert: true, new: true }
    );
    
    console.log(`🔄 Counter updated to ${counter.seq}`);
    console.log(`💡 Next employee ID will be: A${(maxSeq + 1).toString().padStart(7, '0')}`);
    
    // Test the generation
    const nextUser = await User
      .findOne({ empId: /^A\d{7,8}$/ })
      .sort({ empId: -1 })
      .lean();
      
    let nextSeq = 1;
    if (nextUser && nextUser.empId) {
      const lastSeq = parseInt(nextUser.empId.slice(1));
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    
    const testId = `A${nextSeq.toString().padStart(7, '0')}`;
    console.log(`🧪 Test generation result: ${testId}`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting employee ID sequence:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

resetEmployeeIdSequence();