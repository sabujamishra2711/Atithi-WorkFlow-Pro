import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    console.log('=== TOKEN VERIFICATION DEBUG ===');
    console.log('Token from request:', token);
    console.log('ACCESS_TOKEN_SECRET from env:', process.env.ACCESS_TOKEN_SECRET);
    console.log('Token length:', token ? token.length : 'No token');
    console.log('Secret length:', process.env.ACCESS_TOKEN_SECRET ? process.env.ACCESS_TOKEN_SECRET.length : 'No secret');

    if (!token) {
        console.log('❌ No token provided');
        throw new ApiError(401, "Access token is missing");
    }

    try {
        console.log('🔍 Attempting to verify token...');
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('✅ Token decoded successfully:', decoded);

        const user = await User.findById(decoded.userId).select("-Password -refreshtoken");
        console.log('👤 User lookup result:', user ? 'Found' : 'Not found');

        if (!user) {
            console.log('❌ User not found in database');
            throw new ApiError(401, "User not found or invalid token");
        }

        console.log('✅ User authenticated successfully');
        req.user = user;
        next();
    } catch (error) {
        console.log('❌ Token verification failed:', error.name, error.message);
        console.log('Error details:', error);
        throw new ApiError(401, "Invalid or expired token");
    }
});

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    return next();
  }
  return res.status(403).json({ error: "Only admin can perform this action" });
};

export const isHRorAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "HR" || req.user.role === "ADMIN")) {
    return next();
  }
  return res.status(403).json({ error: "Only HR or admin can perform this action" });
};

// Custom middleware for profile image updates
export const canUpdateProfileImage = asyncHandler(async (req, res, next) => {
  // Add safety check for req.user
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }
  
  const { empId } = req.params;
  
  // Add safety check for empId
  if (!empId) {
    throw new ApiError(400, "Employee ID is required");
  }
  
  // Admins and HR can update any profile image
  if (req.user.role === "ADMIN" || req.user.role === "HR") {
    return next();
  }
  
  // Regular employees can only update their own profile image
  if (req.user.empId === empId.toUpperCase()) {
    return next();
  }
  
  // If none of the above conditions are met, deny access
  throw new ApiError(403, "You don't have permission to update this profile image");
});