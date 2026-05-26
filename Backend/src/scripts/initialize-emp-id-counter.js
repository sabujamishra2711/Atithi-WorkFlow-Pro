import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Counter } from '../models/user.model.js';

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

// Initialize employee ID counter
const initializeEmpIdCounter = async () => {
  try {
    await connectDB();
    
    // Find the maximum existing employee ID
    const lastUser = await User
      .findOne({ empId: /^A\d{7}$/ }) // Match 7-digit format
      .sort({ empId: -1 })
      .lean();

    let maxSeq = 0;
    
    if (lastUser && lastUser.empId) {
      // Extract numeric part
      const lastSeq = parseInt(lastUser.empId.slice(1));
      if (!isNaN(lastSeq)) {
        maxSeq = lastSeq;
      }
    }

    // Initialize or update the counter
    await Counter.findByIdAndUpdate(
      { _id: 'empId' },
      { seq: maxSeq },
      { upsert: true, new: true }
    );

    console.log(`✅ Employee ID counter initialized to: ${maxSeq}`);
    console.log(`Next employee ID will be: A${(maxSeq + 1).toString().padStart(7, '0')}`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing employee ID counter:', error);
    mongoose.connection.close();
    process.exit(1);
  }
};

initializeEmpIdCounter();