import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { generateLeaveSummary, generateAttendanceSummary } from '../services/leaveReport.service.js';

// Generate leave summary report
export const getLeaveSummary = asyncHandler(async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const report = await generateLeaveSummary(year);
    
    res.status(200).json(new ApiResponse(200, report, `Leave summary for ${year} generated successfully`));
  
  } catch (error) {
    console.error("Error generating leave summary:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to generate leave summary");
  }
});

// Generate attendance summary
export const getAttendanceSummary = asyncHandler(async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const report = await generateAttendanceSummary(year);
    
    res.status(200).json(new ApiResponse(200, report, `Attendance summary for ${year} generated successfully`));
  
  } catch (error) {
    console.error("Error generating attendance summary:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to generate attendance summary");
  }
});