import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

import {
  registerUser,
  loginUser,
  logoutUser,
  generateEmpId,
  refreshAccessToken,
  uploadProfileImageAndGetUrl,
  getMissingEmpIds,
  // changeCurrentPassword,
  getCurrentUser,
  // updateAccountDetails,
  updateUser,
  forgotPassword,
  verifyOTP,
  resetPassword,
  checkUserForPasswordReset // Add the new controller function
} from "../controllers/user.controller.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/generate-emp-id", generateEmpId);
router.get("/missing-emp-ids", getMissingEmpIds);
router.post("/upload-profile-image", upload.single("file"), uploadProfileImageAndGetUrl);

// Forgot password routes
router.post("/check-user", checkUserForPasswordReset); // Add the new route
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Protected routes (JWT required)
router.get("/me", verifyJWT, getCurrentUser);
router.post("/logout", verifyJWT, logoutUser);
// router.put("/change-password", verifyJWT, changeCurrentPassword);
// router.put("/update-account", verifyJWT, updateAccountDetails);

// Add PATCH endpoint for updating user/employee details
router.patch("/:empId", verifyJWT, updateUser);

// File uploads (avatar & cover image)

export default router;