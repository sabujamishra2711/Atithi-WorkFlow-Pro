/**
 * Cron job script to auto-close attendance sessions that exceed 25 hours
 * This script runs periodically to close open sessions that have been open for more than 25 hours
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import { AttendanceSession } from '../src/models/attendanceSession.model.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Auto-close function
const autoCloseSessions = async () => {
  try {
    console.log('Starting auto-close of long-running sessions...');

    // Find open sessions that are older than 25 hours
    const cutoffTime = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

    const openSessions = await AttendanceSession.find({
      status: 'OPEN',
      inTime: { $lt: cutoffTime }
    });

    console.log(`Found ${openSessions.length} sessions older than 25 hours`);

    let closedCount = 0;

    // Close each session
    for (const session of openSessions) {
      // Set outTime to 25 hours after inTime
      const autoCloseTime = new Date(session.inTime.getTime() + 25 * 60 * 60 * 1000);
      session.outTime = autoCloseTime;
      session.status = 'CLOSED';
      await session.save();
      closedCount++;

      console.log(`Auto-closed session ${session.sessionId} for employee ${session.employeeId}`);
    }

    console.log(`Auto-close completed. Closed ${closedCount} sessions.`);
  } catch (error) {
    console.error('Auto-close error:', error);
  }
};

// Run auto-close
const runAutoClose = async () => {
  await connectDB();
  await autoCloseSessions();
  await mongoose.connection.close();
  console.log('Auto-close script finished');
};

runAutoClose();