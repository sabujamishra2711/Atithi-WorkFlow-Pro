import { Leave } from '../models/leave.model.js';

import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Generate leave summary report
const generateLeaveSummary = asyncHandler(async (year) => {
  const employees = await User.find({ role: { $ne: 'ADMIN' } });
  const report = {};
  
  for (const employee of employees) {
    report[employee.empId] = {
      name: `${employee.firstName} ${employee.lastName}`,
      PL: await generateLeaveTypeSummary(employee.empId, year, 'PL'),
      CL: await generateLeaveTypeSummary(employee.empId, year, 'CL'),
      SL: await generateLeaveTypeSummary(employee.empId, year, 'SL'),
      LWP: await generateLeaveTypeSummary(employee.empId, year, 'LWP'),
      COFF: await generateLeaveTypeSummary(employee.empId, year, 'COFF')
    };
  }
  
  return report;
});

// Generate leave summary for a specific leave type
const generateLeaveTypeSummary = async (employeeId, year, leaveType) => {
  const leave = await Leave.findOne({ 
    empId: employeeId,
    year,
    leaveType 
  });
  
  if (!leave) {
    return {
      allocated: 0,
      used: 0,
      balance: 0,
      carriedForward: 0,
      expired: 0
    };
  }
  
  // Calculate expired leaves (for CL/SL)
  const expired = leave.allocated - leave.used;
  
  return {
    allocated: leave.allocated,
    used: leave.used,
    balance: leave.balance,
    carriedForward: leave.carriedForward,
    expired: leaveType === 'CL' || leaveType === 'SL' ? expired : undefined
  };
};

// Generate attendance summary
const generateAttendanceSummary = asyncHandler(async (year) => {
  const employees = await User.find({ role: { $ne: 'ADMIN' } });
  const report = {};
  
  for (const employee of employees) {
    const employeeId = employee.empId;
    const monthWiseAttendance = {};
    
    // Get all sessions for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const sessions = await AttendanceSession.find({
      employeeId,
      inTime: { $gte: yearStart, $lte: yearEnd }
    }).sort({ inTime: 1 });
    
    // Calculate month-wise attendance
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
      
      // Count sessions that have any part in this month
      const monthSessions = sessions.filter(session => {
        // Session crosses into this month if:
        // 1. inTime is in this month, OR
        // 2. inTime is before this month and (outTime is in this month OR outTime is after this month OR session is still open)
        const inTimeInMonth = session.inTime >= monthStart && session.inTime <= monthEnd;
        const inTimeBeforeMonth = session.inTime < monthStart;
        const outTimeInMonth = session.outTime && session.outTime >= monthStart && session.outTime <= monthEnd;
        const outTimeAfterMonth = session.outTime && session.outTime > monthEnd;
        const isOpen = !session.outTime;
        
        return inTimeInMonth || (inTimeBeforeMonth && (outTimeInMonth || outTimeAfterMonth || isOpen));
      });
      
      // For backward compatibility, count sessions that start in this month as "present days"
      // For night shifts, we need to identify which sessions should be counted for which day
      const presentDays = sessions.filter(session => {
        // Regular sessions that start in this month
        const inTimeInMonth = session.inTime >= monthStart && session.inTime <= monthEnd;
        
        // For night shifts, we only count the session on the IN date, not the OUT date
        if (session.inTime && session.outTime) {
          const inDate = new Date(session.inTime);
          inDate.setHours(0, 0, 0, 0);
          
          const outDate = new Date(session.outTime);
          outDate.setHours(0, 0, 0, 0);
          
          // If IN and OUT are on different dates, this is a night shift
          if (inDate.getTime() !== outDate.getTime()) {
            // For night shifts, only count if the IN date is in this month
            return inTimeInMonth;
          }
        }
        
        // For regular shifts, count if the IN time is in this month
        return inTimeInMonth;
      }).length;
      
      monthWiseAttendance[month] = {
        presentDays: presentDays,
        sessions: monthSessions.length,
        sundaysWorked: monthSessions.filter(session => {
          const sessionDate = new Date(session.inTime);
          return sessionDate.getDay() === 0; // Sunday
        }).length
      };
    }
    
    // Total present days for the year (sessions that started in the year)
    // Apply the same night shift logic for yearly total
    const totalPresentDays = sessions.filter(session => {
      const inTimeInYear = session.inTime >= yearStart && session.inTime <= yearEnd;
      
      // For night shifts, we only count the session on the IN date
      if (session.inTime && session.outTime) {
        const inDate = new Date(session.inTime);
        inDate.setHours(0, 0, 0, 0);
        
        const outDate = new Date(session.outTime);
        outDate.setHours(0, 0, 0, 0);
        
        // If IN and OUT are on different dates, this is a night shift
        if (inDate.getTime() !== outDate.getTime()) {
          // For night shifts, only count if the IN date is in this year
          return inTimeInYear;
        }
      }
      
      // For regular shifts, count if the IN time is in this year
      return inTimeInYear;
    }).length;
    
    report[employeeId] = {
      name: `${employee.firstName} ${employee.lastName}`,
      totalPresentDays: totalPresentDays,
      monthWiseAttendance
    };
  }
  
  return report;
});

// Function to split a session by date for reporting purposes
const splitSessionByDate = (session) => {
  const parts = [];
  const currentDate = new Date(session.inTime);
  currentDate.setHours(0, 0, 0, 0);
  
  const endDate = session.outTime ? new Date(session.outTime) : new Date();
  endDate.setHours(0, 0, 0, 0);
  
  // Add the first day part
  parts.push({
    date: new Date(currentDate),
    inTime: session.inTime,
    outTime: currentDate < endDate ? new Date(currentDate.setHours(23, 59, 59, 999)) : session.outTime
  });
  
  // Add middle days (full days)
  while (currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate < endDate) {
      parts.push({
        date: new Date(currentDate),
        inTime: new Date(currentDate.setHours(0, 0, 0, 0)),
        outTime: new Date(currentDate.setHours(23, 59, 59, 999))
      });
    }
  }
  
  // Add the last day part
  if (session.outTime && currentDate.getTime() === endDate.getTime()) {
    parts.push({
      date: new Date(currentDate),
      inTime: new Date(currentDate.setHours(0, 0, 0, 0)),
      outTime: session.outTime
    });
  }
  
  return parts;
};

export {
  generateLeaveSummary,
  generateLeaveTypeSummary,
  generateAttendanceSummary,
  splitSessionByDate
};