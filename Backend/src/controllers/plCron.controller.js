import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { allocatePLForAllEmployees } from '../services/plAllocation.service.js';

// Run annual PL allocation (should be scheduled to run on April 1st)
export const runAnnualPLAllocation = asyncHandler(async (req, res) => {
  try {
    // Get current year
    const date = new Date();
    const year = date.getFullYear();
    
    // Run PL allocation for all employees
    const allocationResults = await allocatePLForAllEmployees(year);
    
    res.status(200).json(new ApiResponse(200, {
      success: true,
      year: year,
      allocations: allocationResults
    }, "Annual PL allocation completed successfully"));
  
  } catch (error) {
    console.error("Error in annual PL allocation:", error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Failed to complete annual PL allocation");
  }
});