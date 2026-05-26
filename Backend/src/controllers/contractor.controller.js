import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Contractor from "../models/contractor.model.js";
import { validateNotFutureDate } from "../utils/attendanceValidation.js";
import { ContractorSession } from "../models/contractorSession.model.js";

// Add contractor session (IN)
export const addContractorSession = asyncHandler(async (req, res) => {
  const { contractorId, contractorEmployeeId, employeeName, inTime } = req.body;

  // Validate required fields
  if (!contractorId || !contractorEmployeeId || !employeeName || !inTime) {
    throw new ApiError(400, "Missing required fields: contractorId, contractorEmployeeId, employeeName and inTime");
  }

  // Validate contractor exists
  const contractor = await Contractor.findById(contractorId);
  if (!contractor) {
    throw new ApiError(404, "Contractor not found");
  }

  // Validate timestamp is not in the future
  const punchTime = new Date(inTime);
  const futureDateValidation = validateNotFutureDate(punchTime, "Session start time");
  if (!futureDateValidation.isValid) {
    throw new ApiError(400, futureDateValidation.errorMessage);
  }

  // Check if contractor employee already has an OPEN session
  const openSession = await ContractorSession.findOne({
    contractorId,
    contractorEmployeeId,
    status: 'OPEN'
  });

  if (openSession) {
    throw new ApiError(400, "Cannot create session. Contractor employee already has an open session.");
  }

  // Create new session with in_time
  const newSession = await ContractorSession.create({
    sessionId: 0, // Temporary value, will be updated by pre-save hook
    contractorId,
    contractorEmployeeId,
    employeeName,
    inTime: punchTime,
    status: 'OPEN',
    enteredBy: `Manual Entry by Admin - ${req.user?.empId || 'Admin'}`
    // Remove image URL fields
  });

  return res.status(201).json(new ApiResponse(201, newSession, "Contractor session created successfully"));
});

// Update contractor session (OUT)
export const updateContractorSession = asyncHandler(async (req, res) => {
  const { contractorId, contractorEmployeeId, outTime } = req.body;

  // Validate required fields
  if (!contractorId || !contractorEmployeeId || !outTime) {
    throw new ApiError(400, "Missing required fields: contractorId, contractorEmployeeId and outTime");
  }

  // Validate contractor exists
  const contractor = await Contractor.findById(contractorId);
  if (!contractor) {
    throw new ApiError(404, "Contractor not found");
  }

  // Validate timestamp is not in the future
  const punchTime = new Date(outTime);
  const futureDateValidation = validateNotFutureDate(punchTime, "Session end time");
  if (!futureDateValidation.isValid) {
    throw new ApiError(400, futureDateValidation.errorMessage);
  }

  // Check if contractor employee has an OPEN session
  const openSession = await ContractorSession.findOne({
    contractorId,
    contractorEmployeeId,
    status: 'OPEN'
  });

  if (!openSession) {
    throw new ApiError(400, "Cannot update session. No open session found for contractor employee.");
  }

  // Validate that OUT time is after IN time
  if (punchTime < openSession.inTime) {
    throw new ApiError(400, "OUT time cannot be before IN time.");
  }

  // Close the open session
  openSession.outTime = punchTime;
  openSession.status = 'CLOSED';
  openSession.enteredBy = `Manual Entry by Admin - ${req.user?.empId || 'Admin'}`;
  // Remove image URL fields
  await openSession.save();

  return res.status(200).json(new ApiResponse(200, openSession, "Contractor session updated successfully"));
});

// Existing contractor controller functions...
export const addContractor = asyncHandler(async (req, res) => {
  const { name, contractorNo, phoneNo, numEmployees } = req.body;

  // Validate required fields
  if (!name || !contractorNo || !phoneNo || !numEmployees) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if contractor already exists
  const existingContractor = await Contractor.findOne({
    $or: [{ name }, { contractorNo }]
  });

  if (existingContractor) {
    throw new ApiError(409, "Contractor with this name or number already exists");
  }

  // Generate contractor employee IDs
  const contractorIds = [];
  for (let i = 0; i < numEmployees; i++) {
    // Generate 8-character alphanumeric ID
    const id = Math.random().toString(36).substring(2, 10).toUpperCase();
    contractorIds.push(id);
  }

  // Create contractor
  const contractor = await Contractor.create({
    name,
    contractorNo,
    phoneNo,
    numEmployees,
    contractorIds,
    createdBy: req.user?._id
  });

  return res.status(201).json(new ApiResponse(201, contractor, "Contractor added successfully"));
});

export const editContractor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, contractorNo, phoneNo, numEmployees, status } = req.body;

  // Find contractor
  const contractor = await Contractor.findById(id);
  if (!contractor) {
    throw new ApiError(404, "Contractor not found");
  }

  // Check for duplicates (excluding current contractor)
  if (name || contractorNo) {
    const duplicateQuery = {};
    if (name) duplicateQuery.name = name;
    if (contractorNo) duplicateQuery.contractorNo = contractorNo;
    
    const duplicate = await Contractor.findOne({
      $and: [
        { _id: { $ne: id } },
        { $or: [duplicateQuery] }
      ]
    });

    if (duplicate) {
      throw new ApiError(409, "Contractor with this name or number already exists");
    }
  }

  // Update contractor
  const updateData = {};
  if (name) updateData.name = name;
  if (contractorNo) updateData.contractorNo = contractorNo;
  if (phoneNo) updateData.phoneNo = phoneNo;
  if (numEmployees !== undefined) updateData.numEmployees = numEmployees;
  if (status) updateData.status = status;

  // If number of employees changed, update contractorIds
  if (numEmployees !== undefined && numEmployees !== contractor.numEmployees) {
    const currentIds = contractor.contractorIds || [];
    
    if (numEmployees > currentIds.length) {
      // Add new IDs
      const newIds = [];
      for (let i = currentIds.length; i < numEmployees; i++) {
        const id = Math.random().toString(36).substring(2, 10).toUpperCase();
        newIds.push(id);
      }
      updateData.contractorIds = [...currentIds, ...newIds];
    } else if (numEmployees < currentIds.length) {
      // Remove excess IDs
      updateData.contractorIds = currentIds.slice(0, numEmployees);
    }
  }

  const updatedContractor = await Contractor.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  return res.status(200).json(new ApiResponse(200, updatedContractor, "Contractor updated successfully"));
});

export const listContractors = asyncHandler(async (_, res) => {
  const contractors = await Contractor.find({}).sort({ createdAt: -1 });
  
  // Add extra safety check to ensure contractors is an array
  if (!Array.isArray(contractors)) {
    console.warn('Contractors data is not an array:', contractors);
    return res.status(200).json(new ApiResponse(200, [], "Contractors fetched successfully"));
  }
  
  return res.status(200).json(new ApiResponse(200, contractors, "Contractors fetched successfully"));
});

export const getContractorById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contractor = await Contractor.findById(id);
  
  if (!contractor) {
    throw new ApiError(404, "Contractor not found");
  }
  
  return res.status(200).json(new ApiResponse(200, contractor, "Contractor fetched successfully"));
});

export const getContractorByEmployeeId = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  console.log('Getting contractor by employee ID:', employeeId);

  if (!employeeId) {
    console.log('Employee ID is required');
    throw new ApiError(400, "Employee ID is required");
  }

  // Find contractor that has this employee ID in their contractorIds array
  const contractor = await Contractor.findOne({
    contractorIds: employeeId,
    status: 'Active'
  });
  
  console.log('Contractor lookup result:', contractor ? contractor.name : 'Not found');

  if (!contractor) {
    console.log('Active contractor not found for employee ID:', employeeId);
    throw new ApiError(404, "Active contractor not found for this employee ID");
  }

  return res.status(200).json(new ApiResponse(200, {
    contractor: {
      _id: contractor._id,
      name: contractor.name,
      contractorNo: contractor.contractorNo,
      phoneNo: contractor.phoneNo,
      numEmployees: contractor.numEmployees,
      contractorIds: contractor.contractorIds,
      status: contractor.status
    }
  }, "Contractor details retrieved successfully"));
});

export const deleteContractor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const contractor = await Contractor.findById(id);
  if (!contractor) {
    throw new ApiError(404, "Contractor not found");
  }
  
  await Contractor.findByIdAndDelete(id);
  
  return res.status(200).json(new ApiResponse(200, null, "Contractor deleted successfully"));
});
