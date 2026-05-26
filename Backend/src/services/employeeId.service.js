import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Generate the next employee ID based on the highest existing empId in the database
 * @returns {Promise<string>} The next employee ID in format A + 7-digit zero-padded number
 */
export const generateNextEmployeeId = async () => {
  try {
    // Find the employee with the highest empId that matches our format (7 or 8 digits)
    const lastUser = await User
      .findOne({ empId: /^A\d{7,8}$/ }) // Match 7 or 8 digits after A
      .sort({ empId: -1 })             // Sort descending to get the highest
      .lean();

    let nextSeq = 1;

    if (lastUser && lastUser.empId) {
      // Extract numeric part and increment
      const lastSeq = parseInt(lastUser.empId.slice(1));
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    // Format the employee ID with proper zero-padding (always 7 digits)
    // This ensures we don't jump to 8 digits when we reach 1000000
    return `A${nextSeq.toString().padStart(7, '0')}`;
  } catch (error) {
    console.error("Error generating employee ID:", error);
    throw new ApiError(500, "Failed to generate employee ID");
  }
};

/**
 * Validate if an employee ID follows the correct format
 * @param {string} empId - The employee ID to validate
 * @returns {boolean} Whether the employee ID is valid
 */
export const isValidEmployeeId = (empId) => {
  if (!empId || typeof empId !== 'string') return false;
  return /^A\d{7}$/.test(empId); // Only accept 7-digit format
};

/**
 * Check if an employee ID already exists in the database
 * @param {string} empId - The employee ID to check
 * @returns {Promise<boolean>} Whether the employee ID already exists
 */
export const isEmployeeIdExists = async (empId) => {
  try {
    const user = await User.findOne({ empId });
    return !!user;
  } catch (error) {
    console.error("Error checking employee ID existence:", error);
    return false;
  }
};