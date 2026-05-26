import express from "express";
import {
    getSalaryHistory,
    addSalaryHistory,
    updateSalaryHistory,
    deleteSalaryHistory
} from "../controllers/salaryHistory.controller.js";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

console.log('=== SALARY HISTORY ROUTES LOADED ===');

// Get salary history for an employee
router.get("/:empId", verifyJWT, getSalaryHistory);

// Add a new salary history record for an employee
router.post("/:empId", verifyJWT, isAdmin, addSalaryHistory);

// Update a salary history record
router.patch("/:id", verifyJWT, isAdmin, updateSalaryHistory);

// Delete a salary history record
router.delete("/:id", verifyJWT, isAdmin, deleteSalaryHistory);

export default router;