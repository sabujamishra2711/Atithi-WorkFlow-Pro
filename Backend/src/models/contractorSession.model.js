import mongoose from 'mongoose';

// Define the maximum session hours (25 hours)
export const MAX_CONTRACTOR_SESSION_HOURS = 25;

const contractorSessionSchema = new mongoose.Schema({
  sessionId: {
    type: Number,
    required: true,
    unique: true
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contractor',
    required: true
  },
  contractorEmployeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
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
  // Add enteredBy field to track who created the session
  enteredBy: {
    type: String,
    default: 'Contractor Portal'
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
contractorSessionSchema.index({ contractorId: 1, status: 1 });
contractorSessionSchema.index({ contractorEmployeeId: 1, status: 1 });
contractorSessionSchema.index({ inTime: 1 });
contractorSessionSchema.index({ outTime: 1 });

// Auto-increment sessionId
contractorSessionSchema.pre('save', async function (next) {
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
        { _id: 'contractorSession' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      this.sessionId = counter.seq;
      next();
    } catch (error) {
      console.error('Error in contractor session pre-save hook:', error);
      next(error);
    }
  } else {
    next();
  }
});

// Method to check if session has exceeded maximum hours
contractorSessionSchema.methods.hasExceededMaxHours = function () {
  if (!this.inTime) return false;

  const cutoffTime = new Date(this.inTime.getTime() + (MAX_CONTRACTOR_SESSION_HOURS * 60 * 60 * 1000));
  return new Date() > cutoffTime;
};

// Method to auto-close session
contractorSessionSchema.methods.autoClose = function () {
  if (!this.inTime || this.status !== 'OPEN') return false;

  const cutoffTime = new Date(this.inTime.getTime() + (MAX_CONTRACTOR_SESSION_HOURS * 60 * 60 * 1000));
  if (new Date() > cutoffTime) {
    this.outTime = cutoffTime;
    this.status = 'CLOSED';
    this.punchStatus = 'In Only'; // Mark as "IN without OUT" when auto-closed
    return true;
  }
  return false;
};

// Static method to auto-close all expired sessions
contractorSessionSchema.statics.autoCloseExpiredSessions = async function () {
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

export const ContractorSession = mongoose.model('ContractorSession', contractorSessionSchema);