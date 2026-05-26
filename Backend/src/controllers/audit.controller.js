import express from 'express';
import { auditLeaveBalances } from '../services/leaveAudit.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { ApiError } from '../utils/ApiError.js';

const router = express.Router();

// Run leave audit - admin only
router.get('/leave-audit', verifyJWT, asyncHandler(async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const auditResults = await auditLeaveBalances(year);
    
    res.status(200).json({
      success: true,
      message: `Leave audit for ${year} completed successfully`,
      results: auditResults
    });
  
  } catch (error) {
    console.error(`Error running leave audit for ${year}:`, error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Failed to complete leave audit for ${year}`);
  }
}));

export default router;