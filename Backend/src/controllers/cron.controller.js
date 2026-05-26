import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  allocateMonthlyLeaves,
  processYearEnd
} from "../services/leaveAllocation.service.js";
import { AttendanceSession } from "../models/attendanceSession.model.js";
import { ContractorSession } from "../models/contractorSession.model.js";
import { allocateCOFF } from "../scripts/leave-policy-automation.js";

// Run monthly jobs
export const runMonthlyJobs = asyncHandler(async (_, res) => {
  try {
    // Run monthly leave allocation for all employees
    await allocateMonthlyLeaves();

    // Run COFF allocation for eligible employees
    await allocateCOFF();

    res.status(200).json(new ApiResponse(200, null, "Monthly jobs completed"));
  } catch (error) {
    console.error("Error in runMonthlyJobs:", error);
    throw new ApiError(500, "Failed to run monthly jobs");
  }
});

// Run year-end jobs
export const runYearEndJobs = asyncHandler(async (_, res) => {
  try {
    // Run year-end processing
    await processYearEnd();

    res.status(200).json(new ApiResponse(200, null, "Year-end jobs completed"));
  } catch (error) {
    console.error("Error in runYearEndJobs:", error);
    throw new ApiError(500, "Failed to run year-end jobs");
  }
});

// Auto-close sessions older than 25 hours
export const autoCloseSessions = asyncHandler(async (_, res) => {
  try {
    console.log('Starting auto-close of long-running sessions...');

    // Use the static method from AttendanceSession model to auto-close expired sessions
    const closedEmployeeSessions = await AttendanceSession.autoCloseExpiredSessions();

    // Use the static method from ContractorSession model to auto-close expired sessions
    const closedContractorSessions = await ContractorSession.autoCloseExpiredSessions();

    const totalClosedSessions = closedEmployeeSessions.length + closedContractorSessions.length;

    console.log(`Auto-closed ${closedEmployeeSessions.length} employee sessions and ${closedContractorSessions.length} contractor sessions`);

    res.status(200).json(new ApiResponse(200, {
      closedEmployeeSessions: closedEmployeeSessions.length,
      closedContractorSessions: closedContractorSessions.length
    },
      `Auto-close completed. Closed ${closedEmployeeSessions.length} employee sessions and ${closedContractorSessions.length} contractor sessions.`));
  } catch (error) {
    console.error("Error in autoCloseSessions:", error);
    throw new ApiError(500, "Failed to auto-close sessions");
  }
});