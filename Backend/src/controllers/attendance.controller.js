import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

import { User } from '../models/user.model.js';
import { AttendanceSession } from '../models/attendanceSession.model.js';
import { allocateLeave } from '../services/leaveAllocation.service.js';
import XLSX from 'xlsx';

// Handle bulk attendance upload
export const bulkAttendanceUpload = asyncHandler(async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const attendanceData = req.file ? req.file.buffer : req.body.attendanceData;
    
    if (!employeeId || !month || !year || !attendanceData) {
      throw new ApiError(400, "Missing required fields");
    }
    
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }
    
    // Parse Excel file or JSON data
    let parsedData = [];
    
    if (req.file) {
      // Parse Excel file
      const workbook = XLSX.read(attendanceData, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      parsedData = XLSX.utils.sheet_to_json(sheet);
    } else {
      // Parse JSON data
      parsedData = JSON.parse(attendanceData);
    }
    
    // Validate and process attendance data
    for (const record of parsedData) {
      const date = new Date(record.date);
      const punchType = record.present ? "IN" : "OUT";
      
      // Skip weekends if not COFF eligible
      const isSunday = date.getDay() === 0;
      if (isSunday && employee.employeeType !== 'weeklyOffWithCoff') {
        continue;
      }
      
      // Create attendance session
      if (punchType === "IN") {
        await AttendanceSession.create({
          sessionId: 0, // Will be auto-generated
          employeeId,
          inTime: date,
          status: "OPEN"
        });
      } else {
        // For OUT punch, find the latest open session and close it
        const openSession = await AttendanceSession.findOne({
          employeeId,
          status: "OPEN"
        }).sort({ inTime: -1 });
        
        if (openSession) {
          openSession.outTime = date;
          openSession.status = "CLOSED";
          await openSession.save();
        }
      }
    }
    
    // Trigger leave allocation for the month
    await triggerMonthlyLeaveAllocation(employeeId, month, year);
    
    res.status(200).json(new ApiResponse(200, { success: true }, "Attendance uploaded successfully"));
  
  } catch (error) {
    console.error("Error in bulkAttendanceUpload:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to upload attendance data");
  }
});

// Function to trigger monthly leave allocation
const triggerMonthlyLeaveAllocation = async (employeeId, month, year) => {
  try {
    // Get employee data
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }
    
    // Calculate present days for the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Count sessions that started in the month
    const presentDays = await AttendanceSession.countDocuments({
      employeeId,
      inTime: { $gte: monthStart, $lte: monthEnd },
      status: { $in: ["CLOSED", "OPEN"] }
    });
    
    // Total working days in the year (simplified as 240)
    const totalWorkingDays = 240;
    
    // Allocate leaves
    // In a real implementation, you would use a queue system for better performance
    
    // Allocate PL (Paid Leave)
    const plAllocation = await allocateLeave(employeeId, {
      presentDays,
      totalWorkingDays,
      month,
      year
    }, 'PL');
    
    // Allocate CL (Casual Leave) - monthly allocation
    const clAllocation = await allocateLeave(employeeId, {
      month,
      year
    }, 'CL');
    
    // Allocate SL (Sick Leave) - monthly allocation
    const slAllocation = await allocateLeave(employeeId, {
      month,
      year
    }, 'SL');
    
    // Allocate LWP (Leave Without Pay)
    const lwpAllocation = await allocateLeave(employeeId, {
      presentDays,
      totalWorkingDays,
      month,
      year
    }, 'LWP');
    
    return {
      PL: plAllocation,
      CL: clAllocation,
      SL: slAllocation,
      LWP: lwpAllocation
    };
  } catch (error) {
    console.error(`Error triggering monthly leave allocation for ${employeeId}:`, error);
    return { error: error.message };
  }
};
