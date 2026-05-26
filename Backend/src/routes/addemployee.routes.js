import express from "express";
import { verifyJWT, isAdmin } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

import {
  registerEmployee,
  getMissingEmployeeIds,
  generateEmployeeId,
  uploadProfileImage
} from "../controllers/employees/hr.addemployees.controller.js";

const router = express.Router();

// Public routes for employee registration
router.post("/register", registerEmployee);
router.get("/generate-emp-id", generateEmployeeId);
router.get("/missing-emp-ids", getMissingEmployeeIds);
router.post("/upload-profile-image", upload.single("file"), uploadProfileImage);

export default router;