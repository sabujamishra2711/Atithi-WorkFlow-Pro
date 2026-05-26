import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const MAX_CARRY_FORWARD = 36;
const FULL_ALLOCATION_DAYS = 240;
const MIN_PRESENT_DAYS = 20;
const MAX_PL_PER_YEAR = 12;

/**
 * Allocate PL for an employee based on attendance from April to March
 * - Gets all active employees
 * - Calculates PL based on attendance (240 working days = full allocation)
 * - Allocates PL for the year
 * - Handles carry forward from previous year (max 36 days)
 */
export const allocatePL = asyncHandler(async (employeeId, year) => {
  try {
    const employee = await User.findOne({ empId: employeeId, status: 'Active' });
    if (!employee) {
      throw new Error(`Active employee not found: ${employeeId}`);
    }

    const startDate = new Date(year - 1, 3, 1);
    const endDate = new Date(year, 2, 31);

    const punches = await AttendanceSession.find({
      employeeId: employeeId,
      inTime: { $gte: startDate, $lte: endDate }
    }).sort({ inTime: 1 });

    let presentDays = 0;
    const weeklyOffDay = 0;

    punches.forEach(punch => {
      if (punch.punchStatus === 'Present') {
        const dayOfWeek = punch.inTime.getDay();
        if (dayOfWeek !== weeklyOffDay) {
          presentDays++;
        }
      }
    });

    let allocatedPL = 0;
    if (presentDays >= FULL_ALLOCATION_DAYS) {
      allocatedPL = MAX_PL_PER_YEAR;
    } else if (presentDays >= MIN_PRESENT_DAYS) {
      allocatedPL = Math.min(Math.floor((presentDays / FULL_ALLOCATION_DAYS) * MAX_PL_PER_YEAR), MAX_PL_PER_YEAR);
    }

    let leave = await Leave.findOne({
      empId: employeeId,
      year: year,
      leaveType: 'PL'
    });

    if (!leave) {
      leave = new Leave({
        employee: employee._id,
        empId: employeeId,
        year: year,
        leaveType: 'PL'
      });
    }

    const previousYearLeave = await Leave.findOne({
      empId: employeeId,
      year: year - 1,
      leaveType: 'PL'
    });

    let carryForward = 0;
    if (previousYearLeave) {
      const previousBalance = previousYearLeave.balance + (previousYearLeave.carriedForward || 0);
      carryForward = Math.min(previousBalance, MAX_CARRY_FORWARD);
      
      previousYearLeave.balance = 0;
      await previousYearLeave.save();
    }

    leave.allocated = allocatedPL;
    leave.balance = allocatedPL;
    leave.carriedForward = carryForward;
    leave.lastAllocated = new Date();
    
    await leave.save();

    return {
      employeeId,
      year,
      presentDays,
      allocatedPL,
      carryForward,
      totalAvailable: allocatedPL + carryForward,
      message: `Allocated ${allocatedPL} PL for ${employeeId} for year ${year} (carry forward: ${carryForward})`
    };
  } catch (error) {
    console.error(`Error allocating PL for ${employeeId}:`, error);
    throw error;
  }
});

/**
 * Allocate PL for all active employees
 */
export const allocatePLForAllEmployees = asyncHandler(async (year) => {
  try {
    const employees = await User.find({ role: { $ne: 'ADMIN' }, status: 'Active' });
    const results = [];

    for (const employee of employees) {
      try {
        const result = await allocatePL(employee.empId, year);
        results.push(result);
      } catch (error) {
        console.error(`Error allocating PL for ${employee.empId}:`, error);
        results.push({
          employeeId: employee.empId,
          year,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error allocating PL for all employees:', error);
    throw error;
  }
});