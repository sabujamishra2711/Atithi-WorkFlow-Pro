import express from 'express';
import { runMonthlyJobs, runYearEndJobs, autoCloseSessions } from '../controllers/cron.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Monthly jobs - run on the first day of the month
router.get('/monthly', verifyJWT, runMonthlyJobs);

// Year-end jobs - run on December 31st
router.get('/year-end', verifyJWT, runYearEndJobs);

// Auto-close sessions older than 25 hours
router.get('/auto-close-sessions', verifyJWT, autoCloseSessions);

export default router;