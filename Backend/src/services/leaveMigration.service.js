import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';

import { asyncHandler } from '../utils/asyncHandler.js';

// Migrate existing leave data to new format
const migrateLeaveData = asyncHandler(async () => {
  const employees = await User.find({ role: { $ne: 'ADMIN' } });
  const results = {};
  
  for (const employee of employees) {
    results[employee.empId] = {};
    
    // Migrate PL data
    results[employee.empId].PL = await migrateLeaveType(employee.empId, 'PL');
    
    // Migrate CL data
    results[employee.empId].CL = await migrateLeaveType(employee.empId, 'CL');
    
    // Migrate SL data
    results[employee.empId].SL = await migrateLeaveType(employee.empId, 'SL');
    
    // Migrate LWP data
    results[employee.empId].LWP = await migrateLeaveType(employee.empId, 'LWP');
    
    // Migrate COFF data
    results[employee.empId].COFF = await migrateLeaveType(employee.empId, 'COFF');
  }
  
  return results;
});

// Migrate leave data for a specific leave type
const migrateLeaveType = async (employeeId, leaveType) => {
  const leave = await Leave.findOne({ 
    empId: employeeId,
    leaveType 
  });
  
  if (!leave) {
    return { migrated: false, message: 'No existing leave data found' };
  }
  
  // If data is already in new format, skip migration
  if (leave.monthlyAllocation && leave.monthlyAllocation.length > 0) {
    return { migrated: false, message: 'Already in new format' };
  }
  
  // Migrate leave data based on type
  if (leaveType === 'CL' || leaveType === 'SL') {
    // For CL and SL, create monthly allocation based on current balance
    const currentMonth = new Date().getMonth() + 1;
    
    leave.monthlyAllocation = [];
    for (let month = 1; month <= 12; month++) {
      leave.monthlyAllocation.push({
        month,
        allocated: month <= currentMonth ? 1 : 0,
        used: 0,
        balance: month <= currentMonth ? 1 : 0
      });
    }
    
    // Set initial balance based on carried forward
    if (leave.carriedForward > 0) {
      leave.balance = leave.carriedForward;
      leave.carriedForward = 0;
    } else {
      leave.balance = leave.allocated;
    }
    
  } else if (leaveType === 'PL' || leaveType === 'LWP') {
    // For PL and LWP, ensure carried forward balance is correctly capped
    if (leave.carriedForward > 36) {
      leave.carriedForward = 36;
    }
    
    // Update balance to include carried forward
    leave.balance = leave.balance + leave.carriedForward;
    
  } else if (leaveType === 'COFF') {
    // For COFF, ensure validity period is set
    if (leave.lastAllocated) {
      const sixMonthsAgo = new Date(leave.lastAllocated);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      if (sixMonthsAgo > new Date()) {
        // COFF has expired, reset balance
        leave.balance = 0;
      }
    }
  }
  
  // Mark as migrated
  if (!leave.migrated) {
    leave.migrated = true;
    leave.migrationDate = new Date();
  }
  
  await leave.save();
  
  return { 
    migrated: true, 
    before: {
      allocated: leave.allocated,
      used: leave.used,
      balance: leave.balance,
      carriedForward: leave.carriedForward
    },
    after: {
      allocated: leave.allocated,
      used: leave.used,
      balance: leave.balance,
      carriedForward: leave.carriedForward,
      monthlyAllocation: leave.monthlyAllocation ? leave.monthlyAllocation.length : 0
    }
  };
};

// Run leave migration
const runLeaveMigration = asyncHandler(async (req, res) => {
  try {
    const migrationResults = await migrateLeaveData();
    
    res.status(200).json({
      success: true,
      message: 'Leave data migration completed successfully',
      results: migrationResults
    });
  } catch (error) {
    console.error('Error running leave migration:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, 'Failed to complete leave data migration');
  }
});

export {
  migrateLeaveData,
  migrateLeaveType,
  runLeaveMigration
};