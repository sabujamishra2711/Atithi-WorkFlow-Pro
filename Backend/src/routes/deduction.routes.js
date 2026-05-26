import express from 'express';
import {
  createDeduction,
  getDeductions,
  updateDeduction,
  deleteDeduction,
  getAllDeductions,
  getDeductionTypes
} from '../controllers/deduction.controller.js';

const router = express.Router();

// Create a deduction
router.post('/', createDeduction);
// Get all deductions (with optional pagination)
router.get('/all', getAllDeductions);
// Get deductions for an employee/month/year
router.get('/', getDeductions);
// Update a deduction by ID
router.patch('/:id', updateDeduction);
// Delete a deduction by ID
router.delete('/:id', deleteDeduction);
// Get deduction types for dropdown
router.get('/types', getDeductionTypes);

export default router; 