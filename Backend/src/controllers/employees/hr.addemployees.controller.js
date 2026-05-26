import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { generateNextEmployeeId } from "../../services/employeeId.service.js";

// Register a new employee
export const registerEmployee = asyncHandler(async (req, res) => {
  try {
    const {
      empId,
      firstName,
      middleName,
      lastName,
      fatherName,
      email,
      mobile,
      monthlySalary,
      password,
      employeeCategory,
      department,
      position,
      status,
      profileImageUrl,
      shiftDetails,
      // Add other fields as needed
    } = req.body;

    // Validate required fields
    if (!empId || !firstName || !email || !password || !employeeCategory) {
      throw new ApiError(400, "Required fields are missing");
    }

    // Check if user already exists
    const existedUser = await User.findOne({
      $or: [{ empId }, { email }]
    });

    if (existedUser) {
      throw new ApiError(409, "Employee with this ID or email already exists");
    }

    // Create user object
    const user = await User.create({
      empId: empId.toUpperCase(),
      firstName,
      middleName: middleName || "",
      lastName,
      fatherName: fatherName || "",
      email: email.toLowerCase(),
      mobile: mobile || "",
      monthlySalary: monthlySalary || 0,
      password,
      employeeCategory,
      department: department || "",
      position: position || "",
      status: status || "Active",
      profileImageUrl: profileImageUrl || "",
      shiftDetails: shiftDetails || {},
      // Add other fields as needed
    });

    // Remove password from response
    const createdUser = await User.findById(user._id).select("-password");

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the employee");
    }

    return res.status(201).json(
      new ApiResponse(200, createdUser, "Employee registered successfully")
    );
  } catch (error) {
    console.error("Error registering employee:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to register employee");
  }
});

// Upload profile image
export const uploadProfileImage = asyncHandler(async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    // In a real application, you would process and store the file
    // For now, we'll just return the file path
    const filePath = `/uploads/${req.file.filename}`;
    
    return res.status(200).json(
      new ApiResponse(200, { url: filePath }, "Profile image uploaded successfully")
    );
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw new ApiError(500, "Failed to upload profile image");
  }
});

// Get missing employee IDs
export const getMissingEmployeeIds = asyncHandler(async (req, res) => {
  try {
    // Use aggregation pipeline for better performance
    const result = await User.aggregate([
      // Match documents with valid empId format (7 or 8 digits)
      { $match: { empId: { $regex: /^A\d{7,8}$/ } } },
      // Project only the numeric part of empId
      { $project: { 
          numericId: { 
            $toInt: { 
              $substr: ["$empId", 1, { $strLenCP: { $substr: ["$empId", 1, -1] } } ] 
            } 
          } 
        } 
      },
      // Sort by numericId
      { $sort: { numericId: 1 } },
      // Limit to prevent performance issues
      { $limit: 1000 }
    ]);
    
    // Extract numeric IDs
    const idsArray = result.map(item => item.numericId).filter(id => !isNaN(id));
    
    // Use a Set for O(1) lookup
    const idsSet = new Set(idsArray);
    
    // Find max ID efficiently
    let maxId = idsArray.length > 0 ? Math.max(...idsArray) : 0;
    
    // Limit the range to prevent excessive computation
    maxId = Math.min(maxId || 0, 100000000); // Increased limit to handle 8-digit IDs
    
    const missing = [];
    
    // Only check up to a reasonable limit
    const checkLimit = Math.min(maxId, 100000); // Increased limit to handle larger ranges
    
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
        break;
      }
    }
    
    return res.status(200).json({ missingEmpIds: missing });
  } catch (error) {
    console.error("Error getting missing employee IDs:", error);
    throw new ApiError(500, "Failed to get missing employee IDs");
  }
});

// Generate next employee ID
export const generateEmployeeId = asyncHandler(async (req, res) => {
  try {
    const empId = await generateNextEmployeeId();
    return res.status(200).json({ empId });
  } catch (error) {
    console.error("Error generating employee ID:", error);
    throw new ApiError(500, "Failed to generate employee ID");
  }
});