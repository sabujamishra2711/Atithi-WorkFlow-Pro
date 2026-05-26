import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Audit leave balances for all employees
const auditLeaveBalances = asyncHandler(async (year) => {
  const employees = await User.find({ role: { $ne: 'ADMIN' } });
  const auditResults = {};
  
  for (const employee of employees) {
    auditResults[employee.empId] = {
      name: `${employee.firstName} ${employee.lastName}`,
      PL: await auditLeaveType(employee.empId, year, 'PL'),
      CL: await auditLeaveType(employee.empId, year, 'CL'),
      SL: await auditLeaveType(employee.empId, year, 'SL'),
      LWP: await auditLeaveType(employee.empId, year, 'LWP'),
      COFF: await auditLeaveType(employee.empId, year, 'COFF')
    };
  }
  
  return auditResults;
});

// Audit leave balances for a specific leave type
const auditLeaveType = async (employeeId, year, leaveType) => {
  const leave = await Leave.findOne({ 
    empId: employeeId,
    year,
    leaveType 
  });
  
  if (!leave) {
    return {
      status: 'missing',
      message: 'Leave record not found'
    };
  }
  
  // Check validity of leave
  const validityCheck = checkLeaveValidity(leave);
  
  // Check allocation vs used leaves
  const allocationCheck = checkLeaveAllocation(leave);
  
  // Check monthly allocation for CL/SL
  let monthlyCheck = {};
  if (leaveType === 'CL' || leaveType === 'SL') {
    monthlyCheck = checkMonthlyAllocation(leave);
  }
  
  return {
    status: (validityCheck.isValid && allocationCheck.isValid && (leaveType === 'CL' || leaveType === 'SL' ? monthlyCheck.isValid : true)) ? 'valid' : 'invalid',
    validityCheck,
    allocationCheck,
    monthlyCheck,
    details: {
      allocated: leave.allocated,
      used: leave.used,
      balance: leave.balance,
      carriedForward: leave.carriedForward,
      lastAllocated: leave.lastAllocated
    }
  };
};

// Check leave validity
const checkLeaveValidity = (leave) => {
  const now = new Date();
  let isValid = true;
  let message = 'Valid leave record';
  
  if (leave.leaveType === 'PL' || leave.leaveType === 'LWP') {
    // Check 3-year validity for PL/LWP
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    
    if (leave.carriedForward > 0 && leave.lastAllocated < threeYearsAgo) {
      isValid = false;
      message = 'Carry forward leaves older than 3 years';
    }
  } else if (leave.leaveType === 'COFF') {
    // Check 6-month validity for COFF
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    
    if (leave.balance > 0 && leave.lastAllocated < sixMonthsAgo) {
      isValid = false;
      message = 'COFF leaves older than 6 months';
    }
  }
  
  return { isValid, message };
};

// Check leave allocation
const checkLeaveAllocation = (leave) => {
  const totalUsed = leave.used;
  const totalAvailable = leave.balance + leave.used;
  const expectedTotal = leave.allocated + leave.carriedForward;
  
  const isValid = Math.abs(expectedTotal - totalAvailable) < 0.001; // Allow for floating point differences
  let message = 'Allocation matches available balance';
  
  if (!isValid) {
    message = `Mismatch: Allocated(${leave.allocated}) + Carried(${leave.carriedForward}) = ${expectedTotal}, but Available(${leave.balance}) + Used(${leave.used}) = ${totalAvailable}`;
  }
  
  return { isValid, message };
};

// Check monthly allocation for CL/SL
const checkMonthlyAllocation = (leave) => {
  if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
    return {
      isValid: false,
      message: 'No monthly allocation data'
    };
  }
  
  const totalMonthlyBalance = leave.monthlyAllocation.reduce((sum, month) => sum + month.balance, 0);
  const isValid = Math.abs(totalMonthlyBalance - leave.balance) < 0.001;
  let message = 'Monthly balance matches total balance';
  
  if (!isValid) {
    message = `Mismatch: Monthly balance total(${totalMonthlyBalance}) does not match leave balance(${leave.balance})`;
  }
  
  return { isValid, message };
};

export {
  auditLeaveBalances,
  auditLeaveType,
  checkLeaveValidity,
  checkLeaveAllocation,
  checkMonthlyAllocation
};