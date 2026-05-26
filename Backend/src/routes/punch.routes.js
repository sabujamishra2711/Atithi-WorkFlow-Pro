import express from "express";
import {
  recordPunch,
  getFlatRecentPunches,
  deletePunch,
  getPunchesByDate,
  cleanupDuplicatePunches,
  createSession,
  updateSession,
  updateSessionManually,
  getSessionsByEmployeeAndMonth
} from "../controllers/punch.controller.js";
import { getDailyAttendanceWithNightShift } from "../controllers/attendance/hr.dailyattendance.controller.js";
import {
  manualPunchByHR,
  manualOutPunchOverride,
  getRecentManualPunchesByDate
} from "../controllers/attendance/hr.dailymanualattendance.controller.js";
import {
  getManualMonthlyAttendance,
  updateManualMonthlyAttendance,
  updateManualMonthlyAttendanceSessions,
  exportManualMonthlyAttendancePDF
} from "../controllers/attendance/hr.monthlymanualattendance.controller.js";
import {
  getMonthlySummary,
  getMonthlyTrend,
  getEmployeeMonthlyAttendance,
  getAttendanceMonths
} from "../controllers/attendance/hr.monthlyattendance.controller.js";
// Import contractor attendance functions from new controller
import {
  recordContractorPunch,
  getContractorPunchCounts,
  getContractorDetailedPunches,
  getContractorEmployees,
  manualContractorPunchByHR,
  createContractorSession,
  updateContractorSession,
  deleteContractorSession,
  updateContractorSessionsManually,
  getContractorDailyAttendanceWithNightShift // Add the new function
} from "../controllers/attendance/hr.contractorattendance.controller.js";
// Import the new auto session controller
import { recordPunchWithAutoSession } from "../controllers/autoSession.controller.js";
import multer from "../middlewares/multer.middleware.js";
// Import asyncHandler
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.post("/record", recordPunch);
router.post("/record-with-auto-session", recordPunchWithAutoSession);
router.get("/recent", getFlatRecentPunches);

router.post("/manual", manualPunchByHR);
router.post("/manual-out-override", manualOutPunchOverride);
router.delete("/:id", deletePunch);
router.get("/by-date", getPunchesByDate);
router.get("/daily-attendance", getDailyAttendanceWithNightShift);
router.get("/daily-attendance-contractor", getContractorDailyAttendanceWithNightShift); // Add the new route
router.get("/monthly/summary", getMonthlySummary);
router.get("/monthly/trend", getMonthlyTrend);
router.get("/monthly/employees", getEmployeeMonthlyAttendance);
router.get("/monthly/months", getAttendanceMonths);

// Manual monthly attendance routes
router.get("/monthly/manual/:employeeId/:year/:month", getManualMonthlyAttendance);
router.put("/monthly/manual/:employeeId/:year/:month", updateManualMonthlyAttendance);
router.get("/manual/recent", getRecentManualPunchesByDate);

// Manual attendance PDF export route
router.get("/monthly/manual/:employeeId/:year/:month/pdf", asyncHandler(exportManualMonthlyAttendancePDF));
router.post("/monthly/manual/:employeeId/:year/:month/pdf", asyncHandler(exportManualMonthlyAttendancePDF));

// Cleanup duplicate punches
router.post("/cleanup-duplicates", cleanupDuplicatePunches);

// Contractor punch endpoints
router.post('/contractor', recordContractorPunch);
router.get('/contractor/counts', getContractorPunchCounts);
router.get('/contractor/detailed', getContractorDetailedPunches);
router.get('/contractor/employees', getContractorEmployees);
router.post('/contractor/manual', manualContractorPunchByHR);

// Session-based endpoints
router.post("/session/in", createSession);
router.post("/session/out", updateSession);
router.put("/session/manual/:sessionId", updateSessionManually);
router.get('/session/:employeeId/:year/:month', getSessionsByEmployeeAndMonth);
router.put("/session/manual", updateManualMonthlyAttendanceSessions);

// Contractor session-based endpoints
router.post("/contractor/session/in", createContractorSession);
router.post("/contractor/session/out", updateContractorSession);
router.delete("/contractor/session/:sessionId", deleteContractorSession);
router.put("/contractor/session/manual", updateContractorSessionsManually);

export default router;