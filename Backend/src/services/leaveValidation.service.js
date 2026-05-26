import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';

const validateLeaveApplication = async (employeeId, leaveType, startDate, endDate) => {
  const employee = await User.findOne({ empId: employeeId });
  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`);
  }

  const leave = await Leave.findOne({
    empId: employeeId,
    year: startDate.getFullYear(),
    leaveType
  });

  if (!leave) {
    throw new Error(`Leave balance not found for employee ${employeeId}. Please allocate leaves first.`);
  }

  const days = calculateLeaveDays(startDate, endDate);

  if (!leave.canApplyLeave(days)) {
    throw new Error(`Insufficient ${leaveType} balance for employee ${employeeId}`);
  }

  if (leaveType === 'PL' || leaveType === 'LWP') {
    if (leave.carriedForward > 0) {
      const usedFromCarried = Math.min(leave.carriedForward, days);

      if (usedFromCarried < days && leave.balance < (days - usedFromCarried)) {
        throw new Error(`Cannot apply leave out of sequence for ${leaveType}`);
      }
    }
  } else if (leaveType === 'COFF') {
    if (employee.employeeType !== 'weeklyOffWithCoff') {
      throw new Error(`Employee ${employeeId} is not eligible for COFF leave`);
    }
  }

  return { valid: true, days };
};

const calculateLeaveDays = (startDate, endDate) => {
  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }

  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export {
  validateLeaveApplication,
  calculateLeaveDays
};