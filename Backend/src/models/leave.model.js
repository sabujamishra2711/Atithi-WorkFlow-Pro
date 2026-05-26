import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  empId: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['PL', 'CL', 'SL', 'LWP', 'COFF'],
    required: true
  },
  allocated: {
    type: Number,
    default: 0
  },
  used: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0
  },
  carriedForward: {
    type: Number,
    default: 0
  },
  reserved: {
    type: Number,
    default: 0
  },
  encashed: {
    type: Number,
    default: 0
  },
  monthlyAllocation: [{
    month: Number,
    allocated: Number,
    used: Number,
    balance: Number
  }],
  applications: [{
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    days: {
      type: Number,
      required: true
    },
    reason: String,
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    remarks: String
  }],
  auditLog: [{
    action: {
      type: String,
      enum: ['applied', 'approved', 'rejected', 'cancelled', 'encashed']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    remarks: String
  }],
  lastAllocated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
leaveSchema.index({ employee: 1, year: 1, leaveType: 1 }, { unique: true });
leaveSchema.index({ employee: 1, 'applications.status': 1, 'applications.startDate': 1, 'applications.endDate': 1 });

// Method to check if leave can be applied
leaveSchema.methods.canApplyLeave = function (days) {
  return this.availableBalance >= days;
};

// Method to apply leave
leaveSchema.methods.applyLeave = function (days) {
  if (!this.canApplyLeave(days)) {
    throw new Error(`Insufficient ${this.leaveType} balance`);
  }

  if (this.leaveType === 'PL' || this.leaveType === 'LWP') {
    // Use from carried forward first, then from current balance
    let remainingDays = days;
    if (this.carriedForward > 0) {
      const usedFromCarried = Math.min(this.carriedForward, remainingDays);
      this.carriedForward -= usedFromCarried;
      remainingDays -= usedFromCarried;
    }
    if (remainingDays > 0) {
      this.balance -= remainingDays;
    }
  } else {
    // CL/SL/COFF: use from current balance
    this.balance -= days;
  }

  this.used += days;
  return this.save();
};

// Method to allocate leaves for the year - Updated for new policy
leaveSchema.methods.allocateLeaves = function (presentDays, totalWorkingDays, employeeType) {
  const currentMonth = new Date().getMonth() + 1;

  if (this.leaveType === 'PL' || this.leaveType === 'LWP') {
    // PL/LWP allocation logic - No automatic allocation
    // Allocation now happens only through the annual cron job or leave policy automation
    // This method is kept for backward compatibility
  } else if (this.leaveType === 'CL' || this.leaveType === 'SL') {
    // CL/SL: 6 leaves per year, 1 per month
    // This is still automatically allocated monthly

    // Initialize monthly allocation if not exists
    if (!this.monthlyAllocation || this.monthlyAllocation.length === 0) {
      this.monthlyAllocation = [];
    }

    // Find or create current month record
    let currentMonthRecord = this.monthlyAllocation.find(m => m.month === currentMonth);
    if (!currentMonthRecord) {
      currentMonthRecord = {
        month: currentMonth,
        allocated: 0,
        used: 0,
        balance: 0
      };
      this.monthlyAllocation.push(currentMonthRecord);
    }

    // Allocate 1 leave for current month if not already allocated
    if (currentMonthRecord.allocated === 0) {
      currentMonthRecord.allocated = 1;
      currentMonthRecord.balance = 1;

      // Update total allocated (max 6 per year)
      this.allocated = Math.min(6, this.allocated + 1);
    }

    // Calculate total balance from all monthly allocations
    this.balance = this.monthlyAllocation.reduce((sum, month) => sum + month.balance, 0);
  } else if (this.leaveType === 'COFF') {
    // COFF: Only for employees with weeklyOffWithCoff type
    if (employeeType === 'weeklyOffWithCoff') {
      // COFF is allocated based on Sunday attendance
      // This will be handled in the controller
      this.allocated = 0; // Will be calculated based on Sunday attendance
      this.balance = 0;
    }
  }

  this.lastAllocated = new Date();
  return this.save();
};

// Method to carry forward PL/LWP - Updated for new policy
leaveSchema.methods.carryForward = function () {
  if (this.leaveType === 'PL' || this.leaveType === 'LWP') {
    // Carry forward remaining balance (max 3 years = 36 days)
    if (this.balance > 0) {
      this.carriedForward += this.balance;
      this.balance = 0;
    }
    // Lapse leaves older than 3 years
    if (this.carriedForward > 36) { // 12 * 3 years
      this.carriedForward = 36;
    }
  }
  // For CL, SL, and COFF, do nothing as they don't carry forward
  return Promise.resolve(this);
};

// Method to expire CL/SL - Updated for new policy
leaveSchema.methods.expireAnnualLeaves = function () {
  if (this.leaveType === 'CL' || this.leaveType === 'SL') {
    // Expire unused leaves at year end
    const expired = this.balance;

    if (expired > 0) {
      this.allocated -= expired;
      this.balance = 0;
      return this.save();
    }
  }
  // For PL, LWP, and COFF, do nothing in this method
  return Promise.resolve(this);
};

// Method to expire COFF leaves - No changes needed
leaveSchema.methods.expireCOFFLeaves = function () {
  if (this.leaveType === 'COFF') {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

    if (this.lastAllocated < sixMonthsAgo) {
      this.balance = 0;
      return this.save();
    }
  }
  return Promise.resolve(this);
};

leaveSchema.methods.encashLeave = function (days) {
  if (this.leaveType !== 'PL') {
    throw new Error('Only PL can be encashed');
  }

  const maxEncashable = Math.floor(this.availableBalance * 0.5);
  if (days > maxEncashable) {
    throw new Error(`Cannot encash more than 50% of available balance. Max: ${maxEncashable} days`);
  }

  if (days > this.availableBalance) {
    throw new Error(`Insufficient balance. Available: ${this.availableBalance} days`);
  }

  let remainingDays = days;
  if (this.carriedForward > 0) {
    const usedFromCarried = Math.min(this.carriedForward, remainingDays);
    this.carriedForward -= usedFromCarried;
    remainingDays -= usedFromCarried;
  }
  if (remainingDays > 0) {
    this.balance -= remainingDays;
  }

  this.encashed = (this.encashed || 0) + days;
  return this.save();
};

leaveSchema.virtual('availableBalance').get(function () {
  if (this.leaveType === 'PL' || this.leaveType === 'LWP') {
    return this.balance + this.carriedForward;
  }
  return this.balance;
});

leaveSchema.set('toJSON', { virtuals: true });

export const Leave = mongoose.model('Leave', leaveSchema);