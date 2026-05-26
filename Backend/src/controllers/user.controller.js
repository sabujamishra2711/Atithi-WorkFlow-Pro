import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { SalaryHistory } from "../models/salaryHistory.model.js"; // Add this import
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { generateNextEmployeeId } from "../services/employeeId.service.js";
import crypto from "crypto";

// Add email sending utility (using nodemailer)
import nodemailer from "nodemailer";

// Create a transporter for sending emails
let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

export const uploadProfileImageAndGetUrl = async (req, res) => {
  try {
    console.log("REQ FILE:", req.file);
    console.log("REQ BODY:", req.body);
    const localPath = req.body?.file || req.file?.path;
    const empId = req.body?.empId;
    if (!localPath) return res.status(400).json({ error: "No file provided" });
    if (!empId) return res.status(400).json({ error: "Employee ID is required" });

    const result = await uploadOnCloudinary(localPath, empId);
    if (!result) return res.status(500).json({ error: "Cloudinary upload failed" });

    // Save the image URL to the user's profile in database
    const updatedUser = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      { profileImageUrl: result.secure_url },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      console.log("User not found for empId:", empId);
      // Still return the URL even if user doesn't exist yet (for add employee page)
    }

    res.status(200).json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload Error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
}

export const generateEmpId = asyncHandler(async (req, res) => {
  try {
    const empId = await generateNextEmployeeId();
    res.status(200).json({ empId });
  } catch (error) {
    console.error("Error generating employee ID:", error);
    throw new ApiError(500, "Failed to generate employee ID");
  }
});

// Add caching mechanism
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Add a simple rate limiting mechanism
const requestCounts = new Map();
const RATE_LIMIT = 10; // Max requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds

// Periodically clean up old entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up rate limiting entries
  for (const [ip, requests] of requestCounts.entries()) {
    const validRequests = requests.filter(time => time > windowStart);
    if (validRequests.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, validRequests);
    }
  }

  // Clean up cache entries
  for (const [key, { timestamp }] of cache.entries()) {
    if (now - timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW / 2); // Run cleanup every 30 seconds

// Route: GET /api/v1/users/missing-emp-ids
export const getMissingEmpIds = asyncHandler(async (req, res) => {
  console.log('GET /api/v1/users/missing-emp-ids called at:', new Date().toISOString());
  console.log('Request params:', req.params);
  console.log('Request query:', req.query);

  // Check cache first
  const cacheKey = 'missingEmpIds';
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    console.log('Returning cached result');
    return res.status(200).json({ missingEmpIds: cached.data });
  }

  // Simple rate limiting
  const clientIP = req.ip || req.connection.remoteAddress;
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries for this IP
  if (requestCounts.has(clientIP)) {
    const requests = requestCounts.get(clientIP);
    const validRequests = requests.filter(time => time > windowStart);
    requestCounts.set(clientIP, validRequests);
  }

  // Check rate limit
  if (requestCounts.has(clientIP)) {
    const requests = requestCounts.get(clientIP);
    if (requests.length >= RATE_LIMIT) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }
    requests.push(now);
  } else {
    requestCounts.set(clientIP, [now]);
  }

  try {
    // Use aggregation pipeline for better performance
    const result = await User.aggregate([
      // Match documents with valid empId format (7 or 8 digits)
      { $match: { empId: { $regex: /^A\d{7,8}$/ } } },
      // Project only the numeric part of empId
      {
        $project: {
          numericId: {
            $toInt: {
              $substr: ["$empId", 1, { $strLenCP: { $substr: ["$empId", 1, -1] } }]
            }
          }
        }
      },
      // Sort by numericId
      { $sort: { numericId: 1 } },
      // Limit to prevent performance issues
      { $limit: 1000 }
    ]);

    console.log(`Found ${result.length} users with valid empId format`);

    // Extract numeric IDs
    const idsArray = result.map(item => item.numericId).filter(id => !isNaN(id));
    console.log(`Extracted ${idsArray.length} valid numeric IDs`);

    // Use a Set for O(1) lookup
    const idsSet = new Set(idsArray);

    // Find max ID efficiently
    let maxId = idsArray.length > 0 ? Math.max(...idsArray) : 0;

    // Limit the range to prevent excessive computation
    maxId = Math.min(maxId || 0, 100000000); // Increased limit to handle 8-digit IDs
    console.log(`Max ID: ${maxId}`);

    const missing = [];

    // Only check up to a reasonable limit
    const checkLimit = Math.min(maxId, 100000); // Increased limit to handle larger ranges
    console.log(`Checking IDs from 1 to ${checkLimit}`);

    for (let i = 1; i <= checkLimit; i++) {
      if (!idsSet.has(i)) {
        // Format with appropriate padding - 7 digits for numbers < 10000000, 8 digits for >= 10000000
        const formattedId = i >= 10000000
          ? `A${i.toString().padStart(8, "0")}`
          : `A${i.toString().padStart(7, "0")}`;
        missing.push(formattedId);
      }

      // Limit the number of missing IDs to return
      if (missing.length >= 1000) { // Increased limit to provide more missing IDs
        console.log(`Reached limit of 1000 missing IDs`);
        break;
      }
    }

    console.log(`Found ${missing.length} missing IDs`);

    // Cache the result
    cache.set(cacheKey, {
      data: missing,
      timestamp: now
    });

    res.status(200).json({ missingEmpIds: missing });
  } catch (error) {
    console.error('Error in getMissingEmpIds:', error);
    res.status(500).json({
      error: 'Failed to fetch missing employee IDs',
      message: error.message
    });
  }
});


export const generateAccessandRefreshTokens = async (userId) => {
  try {
    const accessToken = jwt.sign(
      { userId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "3h" }
    )

    const refreshToken = jwt.sign(
      { userId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    )

    return { accessToken, refreshToken }
  } catch (error) {
    throw new Error("Token generation failed")
  }
}


export const registerUser = asyncHandler(async (req, res) => {
  console.log('=== REGISTER USER REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  let {
    empId,
    profileImageUrl,
    firstName,
    middleName,
    lastName,
    pan,
    caste,
    subCaste,
    religion,
    fatherName,
    dob,
    placeOfBirth,
    email,
    mobile,
    gender,
    uanNo,
    aadhaarNo,
    bloodGroup,
    identificationMark,
    nationality,
    maritalStatus,
    height,
    weight,
    workingHrs,
    presentAddress,
    currentAddress,
    criminalRecord,
    health,
    extracurricular,
    hobbies,
    references,
    bankDetails,
    education,
    workExperience,
    familyDetails,
    languages,
    emergencyContacts,
    password,
    employeeType,
    employeeCategory,
    monthlySalary,
    joiningDate,
    department,
    position,
    status,
    shiftDetails,
  } = req.body;

  // Generate empId if not provided
  if (!empId) {
    empId = await generateNextEmployeeId();
  }

  // Basic validation with detailed error messages
  const missingFields = [];
  if (!firstName) missingFields.push('firstName');
  if (!lastName) missingFields.push('lastName');
  if (!password) missingFields.push('password');
  if (!employeeCategory) missingFields.push('employeeCategory');

  if (missingFields.length > 0) {
    throw new ApiError(400, `Missing required fields: ${missingFields.join(', ')}`);
  }

  // Duplicate check
  const existingUser = await User.findOne({
    $or: [{ empId }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with this Employee ID or Email already exists.");
  }

  // Create user with all fields including complex objects and arrays
  const user = await User.create({
    empId,
    profileImage: profileImageUrl || "", // Use profileImageUrl for backward compatibility
    profileImageUrl: profileImageUrl || "",
    firstName,
    middleName,
    lastName,
    pan,
    caste,
    subCaste,
    religion,
    fatherName,
    dob,
    placeOfBirth,
    email,
    mobile,
    gender,
    uanNo,
    aadhaarNo,
    bloodGroup,
    identificationMark,
    nationality,
    maritalStatus,
    height,
    weight,
    workingHrs,
    presentAddress,
    currentAddress,
    criminalRecord,
    health,
    extracurricular,
    hobbies,
    references,
    bankDetails,
    education: education || [],
    workExperience: workExperience || [],
    familyDetails: familyDetails || [],
    languages: languages || [],
    emergencyContacts: emergencyContacts || [],
    password,
    employeeType,
    employeeCategory,
    monthlySalary,
    joiningDate,
    department,
    position,
    status,
    // Ensure shiftDetails.workHoursPerDay is set to 9 if not provided
    shiftDetails: {
      ...(shiftDetails || {}),
      workHoursPerDay: shiftDetails?.workHoursPerDay || 9,
    },
  });

  const createdUser = await User.findById(user._id).select("-password"); // Hide password in response

  if (!createdUser) {
    throw new ApiError(500, "User registration failed.");
  }

  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully.")
  );
});


const loginUser = asyncHandler(async (req, res) => {
  const { empId, password } = req.body;

  if (!empId) {
    throw new ApiError(400, "Email or EmpId is required");
  }

  const user = await User.findOne({ empId });

  if (!user) {
    throw new ApiError(401, "Invalid Credentials");
  }

  if (password !== user.password) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshtoken"
  );

  const options = {
    httpOnly: true,
    secure: false, // true if using HTTPS
    sameSite: "lax", // 'none' if using HTTPS
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshtoken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: false, // true if using HTTPS
    sameSite: "lax", // 'none' if using HTTPS
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user || incomingRefreshToken !== user?.refreshtoken) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessandRefreshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: false, // true if using HTTPS
      sameSite: "lax", // 'none' if using HTTPS
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// PATCH handler for updating user/employee details
export const updateUser = asyncHandler(async (req, res) => {
  const { empId } = req.params;
  const update = { ...req.body };

  // Handle salary history when monthlySalary is updated
  if (update.monthlySalary !== undefined) {
    const user = await User.findOne({ empId });
    if (user && user.monthlySalary !== update.monthlySalary) {
      // Close previous salary history record
      await SalaryHistory.updateMany(
        { employee: user._id, effectiveTo: null },
        { $set: { effectiveTo: new Date() } }
      );

      // Insert new salary history record
      await SalaryHistory.create({
        employee: user._id,
        salary: update.monthlySalary,
        effectiveFrom: new Date(),
        source: "manual"
      });
    }
  }

  // Ensure shiftDetails is always an object if present
  if (update.shiftDetails) {
    Object.keys(update.shiftDetails).forEach(key => {
      if (update.shiftDetails[key] === undefined) {
        delete update.shiftDetails[key];
      }
    });
    if (Object.keys(update.shiftDetails).length === 0) {
      delete update.shiftDetails;
    }
  }

  // Build $set object for MongoDB
  const setObj = {};
  Object.keys(update).forEach(key => {
    setObj[key] = update[key];
  });

  const updated = await User.findOneAndUpdate(
    { empId },
    { $set: setObj },
    { new: true, runValidators: true }
  );

  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json(new ApiResponse(200, updated, "User updated successfully"));
});

export {
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
};

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs in memory (in production, use Redis or a database)
const otpStore = new Map();

export const forgotPassword = asyncHandler(async (req, res) => {
  const { empId } = req.body;

  if (!empId) {
    throw new ApiError(400, "Employee ID is required");
  }

  const user = await User.findOne({ empId: empId.toUpperCase() });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user has email
  if (!user.email) {
    throw new ApiError(400, "Please add email in profile");
  }

  // Generate OTP
  const otp = generateOTP();

  // Store OTP with expiration (5 minutes)
  otpStore.set(empId.toUpperCase(), {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
  });

  // Send OTP via email
  let emailSent = false;
  try {
    if (transporter) {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`
      });
      emailSent = true;
    } else {
      console.log(`Email would be sent to: ${user.email} with OTP: ${otp}`);
      emailSent = true; // For development
    }
  } catch (emailError) {
    console.error("Failed to send email:", emailError);
    throw new ApiError(500, "Failed to send OTP via email. Please try again later.");
  }

  console.log(`OTP for ${empId}: ${otp}`);

  return res.status(200).json(
    new ApiResponse(200, {
      message: "OTP sent successfully via email",
      hasEmail: !!user.email
    }, "OTP sent successfully")
  );
});

export const checkUserForPasswordReset = asyncHandler(async (req, res) => {
  const { empId } = req.body;

  if (!empId) {
    throw new ApiError(400, "Employee ID is required");
  }

  const user = await User.findOne({ empId: empId.toUpperCase() });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if user has email
  if (!user.email) {
    throw new ApiError(400, "Please add email in profile");
  }

  return res.status(200).json(
    new ApiResponse(200, {
      message: "User found",
      hasEmail: !!user.email
    }, "User found")
  );
});

export const verifyOTP = asyncHandler(async (req, res) => {
  const { empId, otp } = req.body;

  if (!empId || !otp) {
    throw new ApiError(400, "Employee ID and OTP are required");
  }

  const storedOTP = otpStore.get(empId.toUpperCase());

  if (!storedOTP) {
    throw new ApiError(400, "OTP not found or expired");
  }

  if (Date.now() > storedOTP.expiresAt) {
    otpStore.delete(empId.toUpperCase());
    throw new ApiError(400, "OTP has expired");
  }

  if (storedOTP.otp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }

  // OTP is valid, remove it from store
  otpStore.delete(empId.toUpperCase());

  // Generate a reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  // Store reset token with expiration (1 hour)
  otpStore.set(`reset_${empId.toUpperCase()}`, {
    token: resetTokenHash,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
  });

  return res.status(200).json(
    new ApiResponse(200, {
      resetToken,
      message: "OTP verified successfully"
    }, "OTP verified successfully")
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { empId, resetToken, newPassword } = req.body;

  if (!empId || !resetToken || !newPassword) {
    throw new ApiError(400, "Employee ID, reset token, and new password are required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  const storedToken = otpStore.get(`reset_${empId.toUpperCase()}`);

  if (!storedToken) {
    throw new ApiError(400, "Reset token not found or expired");
  }

  if (Date.now() > storedToken.expiresAt) {
    otpStore.delete(`reset_${empId.toUpperCase()}`);
    throw new ApiError(400, "Reset token has expired");
  }

  const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

  if (storedToken.token !== resetTokenHash) {
    throw new ApiError(400, "Invalid reset token");
  }

  // Update password
  const user = await User.findOneAndUpdate(
    { empId: empId.toUpperCase() },
    { password: newPassword },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Remove reset token from store
  otpStore.delete(`reset_${empId.toUpperCase()}`);

  return res.status(200).json(
    new ApiResponse(200, {}, "Password reset successfully")
  );
});
