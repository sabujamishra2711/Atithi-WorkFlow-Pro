import mongoose from 'mongoose';

// Define the maximum session hours (25 hours)
export const MAX_SESSION_HOURS = 25;

const attendanceSessionSchema = new mongoose.Schema({
  sessionId: {
    type: Number,
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  inTime: {
    type: Date,
    required: true
  },
  outTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN'
  },
  isNightShift: {
    type: Boolean,
    default: false
  },
  // Add punchStatus field to store attendance status
  punchStatus: {
    type: String,
    enum: ['Absent', 'Present', 'In Only'],
    default: 'Absent'
  },
  // Add reason field to store the reason for manual entries
  reason: {
    type: String,
    default: ""
  },
  // Add image URL fields for IN and OUT punches
  inImageUrl: {
    type: String,
    default: ""
  },
  outImageUrl: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
attendanceSessionSchema.index({ employeeId: 1, status: 1 });
attendanceSessionSchema.index({ inTime: 1 });
attendanceSessionSchema.index({ outTime: 1 });
attendanceSessionSchema.index({ employeeId: 1, inTime: 1 });

// Auto-increment sessionId
attendanceSessionSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      let Counter;
      try {
        Counter = mongoose.model('Counter');
      } catch (error) {
        Counter = mongoose.model('Counter', new mongoose.Schema({
          _id: String,
          seq: Number
        }));
      }

      const counter = await Counter.findByIdAndUpdate(
        { _id: 'attendanceSession' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.sessionId = counter.seq;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Method to check if session has exceeded maximum hours
attendanceSessionSchema.methods.hasExceededMaxHours = function () {
  if (!this.inTime) return false;

  const cutoffTime = new Date(this.inTime.getTime() + (MAX_SESSION_HOURS * 60 * 60 * 1000));
  return new Date() > cutoffTime;
};

// Method to auto-close session
attendanceSessionSchema.methods.autoClose = function () {
  if (!this.inTime || this.status !== 'OPEN') return false;

  const cutoffTime = new Date(this.inTime.getTime() + (MAX_SESSION_HOURS * 60 * 60 * 1000));
  if (new Date() > cutoffTime) {
    this.outTime = cutoffTime;
    this.status = 'CLOSED';
    this.punchStatus = 'In Only'; // Mark as "IN without OUT" when auto-closed
    return true;
  }
  return false;
};

// Static method to auto-close all expired sessions
attendanceSessionSchema.statics.autoCloseExpiredSessions = async function () {
  const openSessions = await this.find({ status: 'OPEN' });
  const closedSessions = [];

  for (const session of openSessions) {
    if (session.autoClose()) {
      await session.save();
      closedSessions.push(session);
    }
  }

  return closedSessions;
};

export const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);