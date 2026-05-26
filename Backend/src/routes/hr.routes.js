// routes/hr.routes.js
import express from "express"
import {
  getHRStats,
  getRecentActivities,
  getSalaryTrend
} from "../controllers/hr.controller.js"
import {
  getFastPayroll,
  exportBankSheet,
  exportSalarySheet,
  exportAttendanceSheet,
  exportDailyAttendancePDF,
  exportMonthlyAttendancePDF,
  exportPayrollFilteredPDF,
  getPerformanceAnalytics,
  exportSalarySummaryExcel,
  getMonthlyAttendanceSummary,
  downloadPayslip,
  previewPayslip,
  getEmployeePayroll,
  getMonthlyPayrollSummary
} from "../controllers/payroll/hr.payroll.controller.js"
import { getAllEmployees, deleteEmployee } from "../controllers/employees/hr.employees.controller.js"
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router()

// HR Dashboard routes
router.get("/stats", getHRStats);
router.get("/recent-activities", getRecentActivities);
router.get("/salary-trend", getSalaryTrend);

// Employee management routes
router.get("/employees", getAllEmployees);
router.delete("/:empId", verifyJWT, isAdmin, deleteEmployee);

// Attendance routes
router.get("/attendance/calculate", getMonthlyAttendanceSummary);

// Payroll routes
router.get("/payroll/fast", getFastPayroll);
router.get("/payroll/payslip/:empId", downloadPayslip);
router.get("/payroll/preview/:empId", previewPayslip);
router.get("/payroll/employee", getEmployeePayroll);
router.get("/payroll/summary", getMonthlyPayrollSummary);

// Export routes
router.get("/export/bank-sheet", exportBankSheet);
router.get("/export/salary-sheet", exportSalarySheet);
router.get("/export/attendance-sheet", exportAttendanceSheet);
router.get("/export/daily-attendance-pdf", exportDailyAttendancePDF);
router.get("/export/monthly-attendance", exportMonthlyAttendancePDF);
router.get("/export/payroll-filtered", exportPayrollFilteredPDF);
router.get("/export/salary-summary", exportSalarySummaryExcel);

// Analytics routes
router.get("/analytics/performance", getPerformanceAnalytics);

export default router