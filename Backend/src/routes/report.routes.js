import express from 'express';
import { getLeaveSummary, getAttendanceSummary } from '../controllers/report.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Leave summary report - requires admin role
router.get('/leave-summary', verifyJWT, getLeaveSummary);

// Attendance summary report - requires admin role
router.get('/attendance-summary', verifyJWT, getAttendanceSummary);

export default router;