import express from 'express';
import {
  getLeaveBalance,
  allocateLeaves,
  applyLeave,
  updateLeaveStatus,
  getLeaveApplications,
  addLeaveToAttendance,
  carryForwardLeaves,
  lapseExpiredLeaves,
  lapseExpiredCOFF,
  getLeaveDashboard,
  manualAllocateLeaves,
  getPendingAllocations,
  allocatePendingLeaves,
  checkPendingCOFF,
  removeLeaveApplication,
  exportLeaveReport,
  getLeaveCalendar,
  encashLeave
} from '../controllers/leave.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { runAnnualPLAllocation } from '../controllers/plCron.controller.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/balance/:empId/:year', getLeaveBalance);
router.get('/balance/:empId', getLeaveBalance);

router.put('/manual-allocate/:empId/:year', manualAllocateLeaves);

router.post('/allocate/pending', allocatePendingLeaves);
router.post('/allocate/:empId/:year', allocateLeaves);
router.post('/allocate/:empId', allocateLeaves);

router.post('/apply/:empId/:year', applyLeave);
router.post('/apply/:empId', applyLeave);

router.put('/application/:empId/:applicationId', updateLeaveStatus);

router.delete('/application/:empId/:applicationId', removeLeaveApplication);

router.get('/applications', getLeaveApplications);

router.post('/attendance/add', addLeaveToAttendance);

router.post('/carry-forward/:year', carryForwardLeaves);
router.post('/carry-forward', carryForwardLeaves);

router.post('/lapse-expired', lapseExpiredLeaves);

router.post('/lapse-expired-coff', lapseExpiredCOFF);

router.get('/dashboard', getLeaveDashboard);

router.get('/pending-allocations', getPendingAllocations);

router.get('/pending-coff/:empId', checkPendingCOFF);

router.post('/allocate-pl-annual', runAnnualPLAllocation);

router.get('/report/export', exportLeaveReport);

router.get('/calendar', getLeaveCalendar);

router.post('/encash/:empId', encashLeave);

export default router;