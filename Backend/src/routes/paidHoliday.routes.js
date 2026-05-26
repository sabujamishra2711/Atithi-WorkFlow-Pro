import express from 'express';
import { createPH, getPHs, updatePH, deletePH } from '../controllers/paidHoliday.controller.js';
import { verifyJWT, isHRorAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All PH routes require authentication and HR/Admin role
router.use(verifyJWT, isHRorAdmin);

// Create PH
router.post('/', createPH);
// Get PHs (optionally by year)
router.get('/', getPHs);
// Update PH
router.patch('/:id', updatePH);
// Delete PH
router.delete('/:id', deletePH);

export default router; 