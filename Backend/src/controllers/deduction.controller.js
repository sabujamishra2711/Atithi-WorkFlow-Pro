import { Deduction } from '../models/deduction.model.js';
import { User } from '../models/user.model.js';

// Create a deduction
export const createDeduction = async (req, res) => {
  try {
    const { employee, month, year, type, amount, notes } = req.body;
    if (!employee || !month || !year || !type || amount == null) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const deduction = await Deduction.create({ employee, month, year, type, amount, notes });
    res.status(201).json({ success: true, data: { deduction } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all deductions for an employee in a month/year
export const getDeductions = async (req, res) => {
  try {
    const { employee, month, year } = req.query;
    if (!employee || !month || !year) {
      return res.status(400).json({ success: false, error: 'Missing required query params' });
    }
    const deductions = await Deduction.find({ employee, month: Number(month), year: Number(year) });
    res.status(200).json({ success: true, data: { deductions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all deductions (with optional pagination)
export const getAllDeductions = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 1000));
    const skip = Math.max(0, Number(req.query.skip) || 0);
    const deductions = await Deduction.find({})
      .populate('employee', 'empId firstName lastName department position')
      .sort({ year: -1, month: -1, employee: 1 })
      .skip(skip)
      .limit(limit);
    const total = await Deduction.countDocuments();
    res.status(200).json({ success: true, data: { total, deductions } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update a deduction by ID
export const updateDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const deduction = await Deduction.findByIdAndUpdate(id, update, { new: true });
    if (!deduction) return res.status(404).json({ success: false, error: 'Deduction not found' });
    res.status(200).json({ success: true, data: { deduction } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a deduction by ID
export const deleteDeduction = async (req, res) => {
  try {
    const { id } = req.params;
    const deduction = await Deduction.findByIdAndDelete(id);
    if (!deduction) return res.status(404).json({ success: false, error: 'Deduction not found' });
    res.status(200).json({ success: true, message: 'Deduction deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all deduction types for dropdown
export const getDeductionTypes = async (req, res) => {
  try {
    const types = [
      { value: 'Prof Tax/TDS', label: 'Prof Tax/TDS (Auto: ₹200 if gross ≥ ₹12,000)' },
      { value: 'WF Fund', label: 'WF Fund (Manual)' },
      { value: 'Adv/Loan', label: 'Advance/Loan (Manual)' },
      { value: 'Canteen', label: 'Canteen (Manual)' },
      { value: 'Room Rent', label: 'Room Rent (Manual)' },
      { value: 'PF', label: 'PF (Manual)' },
      { value: 'LOP', label: 'Loss of Pay (Manual)' },
      { value: 'Incentive', label: 'Incentive (Addition)' },
      { value: 'Bonus', label: 'Bonus (Addition)' },
      { value: 'Other', label: 'Other (Manual)' }
    ];
    res.status(200).json({ success: true, data: { types } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}; 