import { User } from "../../models/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

// Get all employees (already exists in hr.employees.controller.js, but including for completeness)
export const getAllEmployees = asyncHandler(async (req, res) => {
  try {
    const employees = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
    return res.status(200).json(
      new ApiResponse(200, { employees }, "Employees fetched successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to fetch employees");
  }
});

// Get single employee by empId (already exists in hr.employees.controller.js, but including for completeness)
export const getEmployeeByEmpId = asyncHandler(async (req, res) => {
  try {
    const { empId } = req.params;
    const employee = await User.findOne({ empId: empId.toUpperCase() });
    
    if (!employee) {
      throw new ApiError(404, "Employee not found");
    }
    
    return res.status(200).json(
      new ApiResponse(200, employee, "Employee fetched successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to fetch employee");
  }
});

// Update employee profile
export const updateEmployeeProfile = asyncHandler(async (req, res) => {
  try {
    const { empId } = req.params;
    const updateFields = req.body;
    
    // Check if employee exists
    const existingEmployee = await User.findOne({ empId: empId.toUpperCase() });
    if (!existingEmployee) {
      throw new ApiError(404, "Employee not found");
    }
    
    // Update employee
    const updatedEmployee = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedEmployee) {
      throw new ApiError(500, "Failed to update employee");
    }
    
    return res.status(200).json(
      new ApiResponse(200, updatedEmployee, "Employee updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to update employee");
  }
});

// Update employee health information
export const updateEmployeeHealth = asyncHandler(async (req, res) => {
  try {
    const { empId } = req.params;
    const healthData = req.body;
    
    // Check if employee exists
    const existingEmployee = await User.findOne({ empId: empId.toUpperCase() });
    if (!existingEmployee) {
      throw new ApiError(404, "Employee not found");
    }
    
    // Update employee health information
    const updatedEmployee = await User.findOneAndUpdate(
      { empId: empId.toUpperCase() },
      { $set: { health: healthData } },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedEmployee) {
      throw new ApiError(500, "Failed to update employee health information");
    }
    
    return res.status(200).json(
      new ApiResponse(200, updatedEmployee, "Employee health information updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, "Failed to update employee health information");
  }
});