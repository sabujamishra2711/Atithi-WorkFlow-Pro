import { Leave } from '../models/leave.model.js';
import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';

import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { PaidHoliday } from '../models/paidHoliday.model.js';
import { validateLeaveApplication } from '../services/leaveValidation.service.js';

// Get leave balance for an employee
export const getLeaveBalance = asyncHandler(async (req, res) => {
  const { empId, year = new Date().getFullYear() } = req.params;
  if (!empId) {
    return res.status(400).json({ error: 'empId is required in the URL.' });
  }

  const user = await User.findOne({ empId });
  if (!user) {
    throw new ApiError(404, "Employee not found");
  }

  const leaves = await Leave.find({
    empId,
    year: parseInt(year)
  }).populate('employee', 'firstName lastName empId');

  const leaveTypes = ['PL', 'CL', 'SL', 'LWP', 'COFF'];
  const balance = {};

  leaveTypes.forEach(type => {
    const leave = leaves.find(l => l.leaveType === type);
    balance[type] = {
      allocated: leave?.allocated || 0,
      used: leave?.used || 0,
      balance: leave?.balance || 0,
      carriedForward: leave?.carriedForward || 0,
      availableBalance: leave?.availableBalance || 0,
      reserved: leave?.reserved || 0
    };
  });

  res.status(200).json(new ApiResponse(200, balance, "Leave balance retrieved successfully"));
});

// Helper function to automatically allocate leaves for an employee
const autoAllocateLeavesForEmployee = async (empId, year) => {
  try {
    const user = await User.findOne({ empId });
    if (!user) {
      throw new Error(`Employee not found: ${empId}`);
    }

    // Calculate present days and total working days for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const sessions = await AttendanceSession.find({
      employeeId: empId,
      inTime: { $gte: yearStart, $lte: yearEnd }
    });

    const presentDays = sessions.length;
    const totalWorkingDays = 240; // Assuming 240 working days per year

    // Calculate COFF based on Sunday attendance
    let coffAllocated = 0;
    if (user.employeeType === 'weeklyOffWithCoff') {
      // Get all Sundays in the year
      const sundays = getSundaysInYear(year);

      // Check attendance on each Sunday
      for (const sunday of sundays) {
        const sundayStart = new Date(sunday);
        sundayStart.setHours(0, 0, 0, 0);
        const sundayEnd = new Date(sunday);
        sundayEnd.setHours(23, 59, 59, 999);

        const sundaySession = await AttendanceSession.findOne({
          employeeId: empId,
          inTime: { $gte: sundayStart, $lte: sundayEnd }
        });

        if (sundaySession) {
          coffAllocated++;
        }
      }
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;

    // Only auto-allocate CL and SL monthly, and COFF based on attendance
    // PL and LWP are allocated annually

    // Allocate CL
    let clLeave = await Leave.findOne({ empId, year: year, leaveType: 'CL' });
    if (!clLeave) {
      clLeave = new Leave({
        employee: user._id,
        empId,
        year: year,
        leaveType: 'CL'
      });
    }
    await clLeave.allocateLeaves(presentDays, totalWorkingDays, user.employeeType);

    // Allocate SL
    let slLeave = await Leave.findOne({ empId, year: year, leaveType: 'SL' });
    if (!slLeave) {
      slLeave = new Leave({
        employee: user._id,
        empId,
        year: year,
        leaveType: 'SL'
      });
    }
    await slLeave.allocateLeaves(presentDays, totalWorkingDays, user.employeeType);

    // Special handling for COFF
    if (user.employeeType === 'weeklyOffWithCoff') {
      let coffLeave = await Leave.findOne({ empId, year: year, leaveType: 'COFF' });
      if (!coffLeave) {
        coffLeave = new Leave({
          employee: user._id,
          empId,
          year: year,
          leaveType: 'COFF'
        });
      }

      // Set allocated and balance to the actual count of Sundays worked
      coffLeave.allocated = coffAllocated;
      coffLeave.balance = coffAllocated;

      // Also update the monthly allocation to reflect actual Sundays worked
      if (!coffLeave.monthlyAllocation || coffLeave.monthlyAllocation.length === 0) {
        coffLeave.monthlyAllocation = [];
        // Initialize all 12 months
        for (let i = 0; i < 12; i++) {
          coffLeave.monthlyAllocation.push({
            month: i + 1,
            allocated: 0,
            used: 0,
            balance: 0
          });
        }
      }

      // Reset all monthly allocations for COFF
      for (let i = 0; i < coffLeave.monthlyAllocation.length; i++) {
        coffLeave.monthlyAllocation[i].allocated = 0;
        coffLeave.monthlyAllocation[i].balance = 0;
      }

      // Get all Sundays in the year and distribute them across months
      const sundays = getSundaysInYear(year);
      for (const sunday of sundays) {
        const sundayStart = new Date(sunday);
        sundayStart.setHours(0, 0, 0, 0);
        const sundayEnd = new Date(sunday);
        sundayEnd.setHours(23, 59, 59, 999);

        const sundaySession = await AttendanceSession.findOne({
          employeeId: empId,
          inTime: { $gte: sundayStart, $lte: sundayEnd }
        });

        if (sundaySession) {
          // This Sunday was worked, allocate to the corresponding month
          const monthIndex = sundayStart.getMonth(); // 0-11
          if (monthIndex >= 0 && monthIndex < 12) {
            coffLeave.monthlyAllocation[monthIndex].allocated += 1;
            coffLeave.monthlyAllocation[monthIndex].balance += 1;
          }
        }
      }

      await coffLeave.save();
    }
  } catch (error) {
    console.error(`Error auto-allocating leaves for ${empId}:`, error.message);
  }
};

// Helper function to get all Sundays in a year
function getSundaysInYear(year) {
  const sundays = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  // Find the first Sunday
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() + 1);
  }

  // Add all Sundays
  while (startDate <= endDate) {
    sundays.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 7);
  }

  return sundays;
}

// Allocate leaves for an employee
export const allocateLeaves = asyncHandler(async (req, res) => {
  const { empId, year = new Date().getFullYear() } = req.params;
  if (!empId) {
    return res.status(400).json({ error: 'empId is required in the URL.' });
  }

  const user = await User.findOne({ empId });
  if (!user) {
    throw new ApiError(404, "Employee not found");
  }

  // Calculate present days and total working days for the year
  const yearStart = new Date(parseInt(year), 0, 1);
  const yearEnd = new Date(parseInt(year), 11, 31);

  const sessions = await AttendanceSession.find({
    employeeId: empId,
    inTime: { $gte: yearStart, $lte: yearEnd }
  });

  const presentDays = sessions.length;
  const totalWorkingDays = 240; // Assuming 240 working days per year

  // Calculate COFF based on Sunday attendance
  let coffAllocated = 0;
  if (user.employeeType === 'weeklyOffWithCoff') {
    // Get all Sundays in the year
    const sundays = getSundaysInYear(parseInt(year));

    // Check attendance on each Sunday
    for (const sunday of sundays) {
      const sundayStart = new Date(sunday);
      sundayStart.setHours(0, 0, 0, 0);
      const sundayEnd = new Date(sunday);
      sundayEnd.setHours(23, 59, 59, 999);

      const sundaySession = await AttendanceSession.findOne({
        employeeId: empId,
        inTime: { $gte: sundayStart, $lte: sundayEnd }
      });

      if (sundaySession) {
        coffAllocated++;
      }
    }
  }

  const leaveTypes = ['PL', 'CL', 'SL', 'LWP', 'COFF'];
  const results = [];

  for (const leaveType of leaveTypes) {
    let leave = await Leave.findOne({ empId, year: parseInt(year), leaveType });

    if (!leave) {
      leave = new Leave({
        employee: user._id,
        empId,
        year: parseInt(year),
        leaveType
      });
    }

    await leave.allocateLeaves(presentDays, totalWorkingDays, user.employeeType);

    // Special handling for COFF
    if (leaveType === 'COFF' && user.employeeType === 'weeklyOffWithCoff') {
      // Set allocated and balance to the actual count of Sundays worked
      leave.allocated = coffAllocated;
      leave.balance = coffAllocated;

      // Also update the monthly allocation to reflect actual Sundays worked
      if (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0) {
        leave.monthlyAllocation = [];
        // Initialize all 12 months
        for (let i = 0; i < 12; i++) {
          leave.monthlyAllocation.push({
            month: i + 1,
            allocated: 0,
            used: 0,
            balance: 0
          });
        }
      }

      // Reset all monthly allocations for COFF
      for (let i = 0; i < leave.monthlyAllocation.length; i++) {
        leave.monthlyAllocation[i].allocated = 0;
        leave.monthlyAllocation[i].balance = 0;
      }

      // Get all Sundays in the year and distribute them across months
      const sundays = getSundaysInYear(parseInt(year));
      for (const sunday of sundays) {
        const sundayStart = new Date(sunday);
        sundayStart.setHours(0, 0, 0, 0);
        const sundayEnd = new Date(sunday);
        sundayEnd.setHours(23, 59, 59, 999);

        const sundaySession = await AttendanceSession.findOne({
          employeeId: empId,
          inTime: { $gte: sundayStart, $lte: sundayEnd }
        });

        if (sundaySession) {
          // This Sunday was worked, allocate to the corresponding month
          const monthIndex = sundayStart.getMonth(); // 0-11
          if (monthIndex >= 0 && monthIndex < 12) {
            leave.monthlyAllocation[monthIndex].allocated += 1;
            leave.monthlyAllocation[monthIndex].balance += 1;
          }
        }
      }

      await leave.save();
    }

    results.push(leave);
  }

  res.status(200).json(new ApiResponse(200, results, "Leaves allocated successfully"));
});

// Apply for leave
export const applyLeave = asyncHandler(async (req, res) => {
  const { empId, year = new Date().getFullYear() } = req.params;
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!empId) {
    throw new ApiError(400, "Employee ID is required");
  }

  if (!leaveType || !startDate || !endDate) {
    throw new ApiError(400, "Leave type, start date, and end date are required");
  }

  const employee = await User.findOne({ empId });
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  if (start > end) {
    throw new ApiError(400, "Start date cannot be after end date");
  }

  const { days } = await validateLeaveApplication(empId, leaveType, start, end);

  const leaveRecord = await Leave.findOne({ empId, year: parseInt(year), leaveType });
  if (leaveRecord) {
    for (const app of leaveRecord.applications) {
      if (app.status === 'Approved' || app.status === 'Pending') {
        const appStart = new Date(app.startDate);
        const appEnd = new Date(app.endDate);

        if (start <= appEnd && end >= appStart) {
          throw new ApiError(400, `Overlapping leave application exists: ${appStart.toISOString().slice(0, 10)} to ${appEnd.toISOString().slice(0, 10)}`);
        }
      }
    }
  }

  let leave = await Leave.findOne({ empId, year: parseInt(year), leaveType });
  if (!leave) {
    throw new ApiError(404, "Leave balance not found. Please allocate leaves first.");
  }

  if (!leave.canApplyLeave(days)) {
    throw new ApiError(400, `Insufficient ${leaveType} balance. Available: ${leave.availableBalance}, Required: ${days}`);
  }

  leave.applications.push({
    startDate: start,
    endDate: end,
    days,
    reason,
    status: 'Pending',
    appliedAt: new Date()
  });

  if (!leave.auditLog) leave.auditLog = [];
  leave.auditLog.push({
    action: 'applied',
    performedBy: req.user?._id || null,
    performedAt: new Date(),
    remarks: `Applied ${days} days ${leaveType} from ${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`
  });

  await leave.save();

  res.status(201).json(new ApiResponse(201, { leave }, "Leave application submitted. Pending approval."));
});

// Approve/Reject leave application
export const updateLeaveStatus = asyncHandler(async (req, res) => {
  const { empId, applicationId } = req.params;
  const { status, remarks } = req.body;
  const approverId = req.user?._id;

  if (!['Approved', 'Rejected'].includes(status)) {
    throw new ApiError(400, "Status must be 'Approved' or 'Rejected'");
  }

  const leave = await Leave.findOne({ empId, 'applications._id': applicationId });
  if (!leave) {
    throw new ApiError(404, "Leave record not found");
  }

  const application = leave.applications.id(applicationId);
  if (!application) {
    throw new ApiError(404, "Leave application not found");
  }

  const previousStatus = application.status;

  if (status === 'Approved' && previousStatus !== 'Approved') {
    if (!leave.canApplyLeave(application.days)) {
      throw new ApiError(400, `Insufficient ${leave.leaveType} balance`);
    }

    await leave.applyLeave(application.days);
  } else if (status === 'Rejected' && previousStatus === 'Approved') {
    leave.used -= application.days;
    if (leave.leaveType === 'PL' || leave.leaveType === 'LWP') {
      leave.balance += application.days;
    } else {
      leave.balance += application.days;
    }
  }

  application.status = status;
  application.approvedBy = approverId;
  application.approvedAt = new Date();
  application.remarks = remarks;

  if (!leave.auditLog) leave.auditLog = [];
  leave.auditLog.push({
    action: status === 'Approved' ? 'approved' : 'rejected',
    performedBy: approverId,
    performedAt: new Date(),
    remarks: remarks || `${status} by approver`
  });

  await leave.save();

  res.status(200).json(new ApiResponse(200, leave, `Leave application ${status.toLowerCase()} successfully`));
});

// Get all leave applications
export const getLeaveApplications = asyncHandler(async (req, res) => {
  const { status, year = new Date().getFullYear(), empId, month } = req.query;

  let query = { year: parseInt(year) };
  if (status) {
    query['applications.status'] = status;
  }
  if (empId) {
    query['empId'] = empId;
  }

  // Use lean() for better performance and handle populate errors
  const leaves = await Leave.find(query)
    .populate('employee', 'firstName lastName empId')
    .populate('applications.approvedBy', 'firstName lastName empId')
    .lean()
    .catch(err => {
      console.error('Population error:', err);
      // If population fails, fetch without populate
      return Leave.find(query).lean();
    });

  const applications = [];
  leaves.forEach(leave => {
    // Check if employee exists (populate might have failed)
    const employeeName = leave.employee ?
      `${leave.employee.firstName || ''} ${leave.employee.lastName || ''}`.trim() :
      'Unknown Employee';

    leave.applications.forEach(app => {
      // Filter by month if specified
      if (month) {
        const appStartMonth = new Date(app.startDate).getMonth() + 1;
        const appEndMonth = new Date(app.endDate).getMonth() + 1;
        const targetMonth = parseInt(month);

        // Check if the application overlaps with the target month
        if (appStartMonth > targetMonth && appEndMonth > targetMonth) {
          return; // Skip this application - it's after the target month
        }
        if (appStartMonth < targetMonth && appEndMonth < targetMonth) {
          return; // Skip this application - it's before the target month
        }
      }

      applications.push({
        ...app,
        empId: leave.empId,
        employeeName: employeeName,
        leaveType: leave.leaveType
      });
    });
  });

  console.log('Sending response with applications:', applications.length);
  console.log('Applications data:', applications);

  res.status(200).json(new ApiResponse(200, applications, "Leave applications retrieved successfully"));
});

// Add leave to monthly attendance (for manual attendance page)
export const addLeaveToAttendance = asyncHandler(async (req, res) => {
  const { empId, date, leaveType } = req.body;

  const user = await User.findOne({ empId });
  if (!user) {
    throw new ApiError(404, "Employee not found");
  }

  const year = new Date(date).getFullYear();
  let leave = await Leave.findOne({ empId, year, leaveType });

  if (!leave) {
    throw new ApiError(404, "Leave balance not found. Please allocate leaves first.");
  }

  // Check if leave can be applied
  if (!leave.canApplyLeave(1)) {
    throw new ApiError(400, `Insufficient ${leaveType} balance. Available: ${leave.availableBalance}`);
  }

  // Apply 1 day leave
  await leave.applyLeave(1);

  // Add leave application
  leave.applications.push({
    startDate: new Date(date),
    endDate: new Date(date),
    days: 1,
    reason: 'Manual attendance entry',
    status: 'Approved',
    approvedBy: req.user._id,
    approvedAt: new Date()
  });

  await leave.save();

  res.status(200).json(new ApiResponse(200, leave, "Leave added to attendance successfully"));
});

// Carry forward leaves (run at year end)
export const carryForwardLeaves = asyncHandler(async (req, res) => {
  const { year = new Date().getFullYear() - 1 } = req.params;

  const leaves = await Leave.find({ year: parseInt(year) });
  const results = [];

  for (const leave of leaves) {
    await leave.carryForward();
    results.push(leave);
  }

  res.status(200).json(new ApiResponse(200, results, "Leaves carried forward successfully"));
});

// Lapse expired leaves (run monthly for CL/SL)
export const lapseExpiredLeaves = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({
    leaveType: { $in: ['CL', 'SL'] }
  });

  const results = [];
  for (const leave of leaves) {
    await leave.expireAnnualLeaves();
    results.push(leave);
  }

  res.status(200).json(new ApiResponse(200, results, "Expired leaves lapsed successfully"));
});

// Lapse expired COFF (run monthly)
export const lapseExpiredCOFF = asyncHandler(async (req, res) => {
  const leaves = await Leave.find({
    leaveType: 'COFF'
  });

  const results = [];
  for (const leave of leaves) {
    await leave.lapseExpiredCOFF();
    results.push(leave);
  }

  res.status(200).json(new ApiResponse(200, results, "Expired COFF lapsed successfully"));
});

// Get leave dashboard data
export const getLeaveDashboard = asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();

  // Get leave statistics
  const leaveStats = await Leave.aggregate([
    { $match: { year: currentYear } },
    {
      $group: {
        _id: '$leaveType',
        totalAllocated: { $sum: '$allocated' },
        totalUsed: { $sum: '$used' },
        totalBalance: { $sum: '$balance' },
        totalCarriedForward: { $sum: '$carriedForward' }
      }
    }
  ]);

  // Get pending applications count
  const pendingCount = await Leave.aggregate([
    { $match: { year: currentYear } },
    { $unwind: '$applications' },
    { $match: { 'applications.status': 'Pending' } },
    { $count: 'count' }
  ]);

  const dashboard = {
    stats: leaveStats,
    pendingApplications: pendingCount[0]?.count || 0,
    currentYear
  };

  res.status(200).json(new ApiResponse(200, dashboard, "Leave dashboard data retrieved successfully"));
});

export const manualAllocateLeaves = asyncHandler(async (req, res) => {
  console.log('=== MANUAL ALLOCATE LEAVES START ===');
  console.log('Request params:', req.params);
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);

  const { empId, year } = req.params;
  const { PL, CL, SL, LWP, COFF } = req.body;
  const leaveTypes = { PL, CL, SL, LWP, COFF };

  console.log('Parsed params - empId:', empId, 'year:', year);
  console.log('Parsed body - leaveTypes:', leaveTypes);

  if (!empId) {
    console.error('Missing empId in request params');
    throw new ApiError(400, "Employee ID is required");
  }

  if (!year) {
    console.error('Missing year in request params');
    throw new ApiError(400, "Year is required");
  }

  const user = await User.findOne({ empId });
  if (!user) {
    console.error('Employee not found for empId:', empId);
    throw new ApiError(404, `Employee not found with ID: ${empId}`);
  }

  console.log('Found user:', user.empId, user.firstName, user.lastName);

  const results = [];
  for (const [leaveType, value] of Object.entries(leaveTypes)) {
    if (typeof value !== 'number' || isNaN(value)) {
      console.log(`Skipping ${leaveType} as value is not a valid number:`, value);
      continue;
    }

    console.log(`Processing ${leaveType} allocation for ${empId}:`, value);

    let leave = await Leave.findOne({ empId, year: parseInt(year), leaveType });
    if (!leave) {
      console.log(`Creating new leave record for ${leaveType}`);
      leave = new Leave({ employee: user._id, empId, year: parseInt(year), leaveType });
    } else {
      console.log(`Updating existing leave record for ${leaveType}`);
    }

    leave.allocated = value;
    // Properly calculate balance: if used > 0, balance = allocated - used, else set to allocated
    // But ensure balance never goes negative
    leave.balance = (leave.used && leave.used > 0) ? Math.max(0, value - leave.used) : value;

    console.log(`${leaveType} - allocated: ${leave.allocated}, used: ${leave.used}, balance: ${leave.balance}`);

    // For COFF, also initialize monthly allocation if needed
    if (leaveType === 'COFF' && (!leave.monthlyAllocation || leave.monthlyAllocation.length === 0)) {
      leave.monthlyAllocation = Array(12).fill().map((_, i) => ({
        month: i + 1,
        allocated: 0,
        used: 0,
        balance: 0
      }));
    }

    await leave.save();
    console.log(`Saved ${leaveType} leave record for ${empId}`);
    results.push(leave);
  }

  console.log('Manual allocation completed for:', empId);
  console.log('Results:', results);
  console.log('=== MANUAL ALLOCATE LEAVES END ===');

  res.status(200).json(new ApiResponse(200, results, "Leaves manually allocated successfully"));
});

export const getPendingAllocations = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const users = await User.find({ role: { $ne: 'ADMIN' } });
    const pending = [];
    const pendingDetails = [];
    const showDetails = req.query.details === '1';

    for (const user of users) {
      const empId = user.empId;
      // Calculate expected allocations
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);
      const sessions = await AttendanceSession.find({ employeeId: empId, inTime: { $gte: yearStart, $lte: yearEnd } });
      const presentDays = sessions.length;
      const totalWorkingDays = 240;
      // Calculate COFF based on Sunday attendance
      let coffAllocated = 0;
      if (user.employeeType === 'weeklyOffWithCoff') {
        const sundays = getSundaysInYear(currentYear);
        for (const sunday of sundays) {
          const sundayStart = new Date(sunday);
          sundayStart.setHours(0, 0, 0, 0);
          const sundayEnd = new Date(sunday);
          sundayEnd.setHours(23, 59, 59, 999);
          const sundaySession = await AttendanceSession.findOne({ employeeId: empId, inTime: { $gte: sundayStart, $lte: sundayEnd } });
          if (sundaySession) coffAllocated++;
        }
      }
      // What the allocations should be
      const expected = {
        PL: (presentDays >= 20 && totalWorkingDays >= 240) ? 12 : 0,
        CL: 6,
        SL: 6,
        LWP: (presentDays >= 20 && totalWorkingDays >= 240) ? 12 : 0,
        COFF: (user.employeeType === 'weeklyOffWithCoff') ? coffAllocated : 0
      };
      // Get stored leave records
      const leaves = await Leave.find({ empId, year: currentYear });
      let needsAllocation = false;
      const mismatchedLeaves = [];
      for (const [type, expectedValue] of Object.entries(expected)) {
        const leave = leaves.find(l => l.leaveType === type);
        if (!leave || (leave.allocated !== expectedValue && !(leave.allocated === 0 && leave.reserved > 0))) {
          needsAllocation = true;
          mismatchedLeaves.push(type);
        }
      }
      if (needsAllocation) {
        pending.push(user);
        if (showDetails) {
          pendingDetails.push({
            name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            empId: user.empId,
            mismatchedLeaves
          });
        }
      }
    }
    if (showDetails) {
      res.json({ success: true, pending, pendingDetails });
    } else {
      res.json({ success: true, pending });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const allocatePendingLeaves = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const users = await User.find({ role: { $ne: 'ADMIN' } });
    const missingEmployees = [];
    let allocatedCount = 0;
    const isNewYear = (new Date().getMonth() === 0); // January
    const previousYear = currentYear - 1;

    for (const user of users) {
      try {
        const empId = user.empId;
        if (!empId) {
          console.warn(`[ALLOCATE] Skipping user with missing empId:`, user);
          continue;
        }
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);
        const sessions = await AttendanceSession.find({ employeeId: empId, inTime: { $gte: yearStart, $lte: yearEnd } });
        const presentDays = sessions.length;
        const totalWorkingDays = 240;
        let coffAllocated = 0;
        if (user.employeeType === 'weeklyOffWithCoff') {
          const sundays = getSundaysInYear(currentYear);
          for (const sunday of sundays) {
            const sundayStart = new Date(sunday);
            sundayStart.setHours(0, 0, 0, 0);
            const sundayEnd = new Date(sunday);
            sundayEnd.setHours(23, 59, 59, 999);
            const sundaySession = await AttendanceSession.findOne({ employeeId: empId, inTime: { $gte: sundayStart, $lte: sundayEnd } });
            if (sundaySession) coffAllocated++;
          }
        }
        // Calculate reserved for PL/LWP
        let reservedPL = 0;
        let reservedLWP = 0;
        if (!isNewYear) {
          // During the year, check if on track for eligibility
          if (presentDays >= 20 && totalWorkingDays >= 240) {
            reservedPL = 12;
            reservedLWP = 12;
          }
        }
        // At the start of the year, check previous year's attendance
        let allocatePL = 0;
        let allocateLWP = 0;
        if (isNewYear) {
          const prevYearStart = new Date(previousYear, 0, 1);
          const prevYearEnd = new Date(previousYear, 11, 31);
          const prevYearSessions = await AttendanceSession.find({ employeeId: empId, inTime: { $gte: prevYearStart, $lte: prevYearEnd } });
          const prevPresentDays = prevYearSessions.length;
          if (prevPresentDays >= 240) {
            allocatePL = 12;
            allocateLWP = 12;
          }
        }
        const expected = {
          PL: allocatePL,
          CL: 6,
          SL: 6,
          LWP: allocateLWP,
          COFF: (user.employeeType === 'weeklyOffWithCoff') ? coffAllocated : 0
        };
        const leaveTypes = ['PL', 'CL', 'SL', 'LWP', 'COFF'];
        for (const leaveType of leaveTypes) {
          let leave = await Leave.findOne({ empId, year: currentYear, leaveType });
          const expectedValue = expected[leaveType];
          if (!leave) {
            leave = new Leave({ employee: user._id, empId, year: currentYear, leaveType });
          }
          leave.allocated = expectedValue;
          leave.balance = (leave.used && leave.used > 0) ? (expectedValue - leave.used) : expectedValue;
          // Set reserved for PL/LWP during the year
          if (leaveType === 'PL') leave.reserved = reservedPL;
          if (leaveType === 'LWP') leave.reserved = reservedLWP;
          await leave.save();
        }
        allocatedCount++;
      } catch (err) {
        missingEmployees.push(user.empId || user._id);
        console.warn(`[ALLOCATE] Employee not found or error allocating for ID: ${user.empId || user._id} - Error: ${err.message}`);
        continue;
      }
    }

    res.json({
      success: true,
      message: `Allocated leaves for ${allocatedCount} employees (on demand).`,
      missingEmployees,
      missingCount: missingEmployees.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const checkPendingCOFF = async (req, res) => {
  try {
    const { empId } = req.params;
    const currentYear = new Date().getFullYear();
    const coffLeave = await Leave.findOne({ empId, year: currentYear, leaveType: 'COFF' });
    res.json({
      pending: !coffLeave,
      year: currentYear,
      empId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Remove/cancel a leave application
export const removeLeaveApplication = asyncHandler(async (req, res) => {
  const { empId, applicationId } = req.params;

  console.log('=== REMOVE LEAVE APPLICATION DEBUG ===');
  console.log('empId:', empId);
  console.log('applicationId:', applicationId);
  console.log('user:', req.user);
  console.log('request headers:', req.headers);

  // Find the leave record containing this application
  const leave = await Leave.findOne({
    empId,
    'applications._id': applicationId
  });

  console.log('Found leave record:', leave ? 'Yes' : 'No');
  if (leave) {
    console.log('Leave record details:', {
      empId: leave.empId,
      leaveType: leave.leaveType,
      applicationsCount: leave.applications.length
    });
    console.log('Leave methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(leave)).filter(name => typeof leave[name] === 'function'));
  }

  if (!leave) {
    console.log('Leave record not found for empId:', empId, 'applicationId:', applicationId);
    throw new ApiError(404, "Leave record not found");
  }

  // Find the specific application
  const application = leave.applications.id(applicationId);
  console.log('Found application:', application ? 'Yes' : 'No');
  if (application) {
    console.log('Application details:', {
      id: application._id,
      status: application.status,
      days: application.days
    });
    console.log('Application methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(application)).filter(name => typeof application[name] === 'function'));
  }

  if (!application) {
    console.log('Leave application not found in leave record');
    throw new ApiError(404, "Leave application not found");
  }

  // Allow removal of any application regardless of status
  console.log('Application status:', application.status, '- Proceeding with removal');

  // Store original values for rollback if needed
  const originalUsed = leave.used;
  const originalBalance = leave.balance;
  const originalCarriedForward = leave.carriedForward;

  try {
    // Revert the leave balance
    const days = application.days;
    console.log('Reverting leave balance for', days, 'days');

    // Reverse the used count
    leave.used -= days;

    if (leave.leaveType === 'PL' || leave.leaveType === 'LWP') {
      // For PL/LWP, we need to add the days back
      // Since we don't track exactly where the days were taken from during applyLeave,
      // we'll add them back to balance first, then adjust carriedForward if needed
      leave.balance += days;

      // If balance exceeds what it should be (considering carriedForward), 
      // adjust carriedForward accordingly
      const maxBalance = leave.allocated - (leave.used - leave.carriedForward);
      if (leave.balance > maxBalance) {
        const excess = leave.balance - maxBalance;
        leave.balance -= excess;
        leave.carriedForward += excess;
      }
    } else {
      // For CL/SL/COFF, add days back to balance
      leave.balance += days;
    }

    // Remove the application
    // Use pull method to remove subdocument from array
    console.log('Removing application from leave record');
    leave.applications.pull(application);
    console.log('Application pulled from array');

    console.log('Saving leave record');
    const savedLeave = await leave.save();
    console.log('Leave record saved:', savedLeave ? 'Success' : 'Failed');
    console.log('Leave application removed successfully');

      res.status(200).json(new ApiResponse(200, leave, "Leave application removed successfully"));
    } catch (error) {
      console.log('Error removing leave application:', error);
      leave.used = originalUsed;
      leave.balance = originalBalance;
      leave.carriedForward = originalCarriedForward;
      throw error;
    }
  });

export const exportLeaveReport = asyncHandler(async (req, res) => {
  const { month, year = new Date().getFullYear(), department } = req.query;

  let query = { year: parseInt(year) };

  const leaves = await Leave.find(query)
    .populate('employee', 'firstName lastName empId department')
    .lean();

  const reportData = [];
  for (const leave of leaves) {
    for (const app of leave.applications) {
      if (month) {
        const appMonth = new Date(app.startDate).getMonth() + 1;
        if (appMonth !== parseInt(month)) continue;
      }
      
      if (department && leave.employee?.department !== department) continue;

      reportData.push({
        empId: leave.empId,
        employeeName: leave.employee ? `${leave.employee.firstName || ''} ${leave.employee.lastName || ''}`.trim() : 'Unknown',
        department: leave.employee?.department || '',
        leaveType: leave.leaveType,
        fromDate: new Date(app.startDate).toISOString().slice(0, 10),
        toDate: new Date(app.endDate).toISOString().slice(0, 10),
        days: app.days,
        status: app.status,
        reason: app.reason || ''
      });
    }
  }

  const csvHeader = 'Employee ID,Employee Name,Department,Leave Type,From Date,To Date,Days,Status,Reason\n';
  const csvBody = reportData.map(r => 
    `${r.empId},"${r.employeeName}",${r.department},${r.leaveType},${r.fromDate},${r.toDate},${r.days},${r.status},"${r.reason}"`
  ).join('\n');

  const csv = csvHeader + csvBody;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=leave_report_${year}_${month || 'all'}.csv`);
  res.status(200).send(csv);
});

export const getLeaveCalendar = asyncHandler(async (req, res) => {
  const { month, year = new Date().getFullYear(), department } = req.query;

  if (!month) {
    throw new ApiError(400, "Month is required");
  }

  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);

  const leaves = await Leave.find({
    year: parseInt(year),
    'applications.status': 'Approved'
  }).populate('employee', 'firstName lastName empId department');

  const calendarData = {};

  for (const leave of leaves) {
    if (department && leave.employee?.department !== department) continue;

    for (const app of leave.applications) {
      if (app.status !== 'Approved') continue;

      const appStart = new Date(app.startDate);
      const appEnd = new Date(app.endDate);

      let currentDate = new Date(Math.max(appStart.getTime(), startDate.getTime()));
      const lastDate = new Date(Math.min(appEnd.getTime(), endDate.getTime()));

      while (currentDate <= lastDate) {
        const dateKey = currentDate.toISOString().slice(0, 10);

        if (!calendarData[dateKey]) {
          calendarData[dateKey] = [];
        }

        calendarData[dateKey].push({
          empId: leave.empId,
          name: leave.employee ? `${leave.employee.firstName || ''} ${leave.employee.lastName || ''}`.trim() : 'Unknown',
          leaveType: leave.leaveType,
          status: app.status
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  const result = Object.entries(calendarData).map(([date, employees]) => ({
    date,
    employees
  }));

  res.status(200).json(new ApiResponse(200, result, "Leave calendar data retrieved successfully"));
});

export const encashLeave = asyncHandler(async (req, res) => {
  const { empId } = req.params;
  const { days, year = new Date().getFullYear() } = req.body;

  if (!empId || !days) {
    throw new ApiError(400, "Employee ID and days are required");
  }

  if (days <= 0) {
    throw new ApiError(400, "Days must be a positive number");
  }

  const leave = await Leave.findOne({ empId, year: parseInt(year), leaveType: 'PL' });
  if (!leave) {
    throw new ApiError(404, "PL balance not found");
  }

  try {
    await leave.encashLeave(days);

    if (!leave.auditLog) leave.auditLog = [];
    leave.auditLog.push({
      action: 'encashed',
      performedBy: req.user?._id || null,
      performedAt: new Date(),
      remarks: `Encashed ${days} PL days`
    });

    await leave.save();

    res.status(200).json(new ApiResponse(200, {
      encashed: days,
      totalEncashed: leave.encashed,
      remainingBalance: leave.availableBalance
    }, "Leave encashed successfully"));
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});
