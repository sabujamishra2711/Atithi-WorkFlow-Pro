import express from "express";
import { 
  getAllEmployees, 
  getSingleEmployees, 
  updateEmployee, 
  deleteEmployee, 
  downloadEmployeeIdCard, 
  downloadEmployeeBioData, 
  updateProfileImage,
  getEmployeeHealth,
  updateEmployeeHealth
} from "../controllers/employees/hr.employees.controller.js";
import { isAdmin, verifyJWT, canUpdateProfileImage } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/getAllEmployees", getAllEmployees);

router.get("/:empId/idcard", verifyJWT, isAdmin, downloadEmployeeIdCard);
router.get("/:empId/biodata", verifyJWT, isAdmin, downloadEmployeeBioData);
router.get("/:empId", getSingleEmployees);
router.get("/:empId/health", getEmployeeHealth);
router.patch("/:empId", verifyJWT, updateEmployee);
router.patch("/:empId/health", verifyJWT, updateEmployeeHealth);
router.patch("/:empId/profile-image", verifyJWT, canUpdateProfileImage, upload.single('profileImage'), updateProfileImage);
router.delete("/:empId", verifyJWT, isAdmin, deleteEmployee);

export default router;