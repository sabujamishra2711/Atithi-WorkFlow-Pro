// cleanupOrphanedRecords.js
import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { Leave } from '../models/leave.model.js';


const MONGO_URI = 'mongodb+srv://mscoders:mscoders24@cluster0.j8lne.mongodb.net/atithillp';

async function cleanup() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Get all valid empIds
  const userEmpIds = await User.distinct('empId');
  console.log('Valid empIds:', userEmpIds.length);

  // Delete orphaned leave records
  const leaveResult = await Leave.deleteMany({ empId: { $nin: userEmpIds } });
  console.log('Orphaned leave records deleted:', leaveResult.deletedCount);

  // Delete orphaned punch records
  const punchResult = await Punch.deleteMany({ employeeId: { $nin: userEmpIds } });
  console.log('Orphaned punch records deleted:', punchResult.deletedCount);

  await mongoose.disconnect();
  console.log('Cleanup complete.');
}

cleanup().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
}); 