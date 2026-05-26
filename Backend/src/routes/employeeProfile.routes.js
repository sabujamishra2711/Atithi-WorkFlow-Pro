import express from "express";
import {
  getAllEmployees,
  getEmployeeByEmpId,
  updateEmployeeProfile,
  updateEmployeeHealth
} from "../controllers/employees/hr.employeesprofile.controller.js";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/getAllEmployees", getAllEmployees);

// Protected routes
router.get("/:empId", verifyJWT, getEmployeeByEmpId);
router.patch("/:empId", verifyJWT, updateEmployeeProfile);
router.patch("/:empId/health", verifyJWT, updateEmployeeHealth);

export default router;