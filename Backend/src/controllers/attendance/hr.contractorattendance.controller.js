import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { uploadPunchImageToCloudinary } from "../../utils/cloudinary.js";
import Contractor from '../../models/contractor.model.js';
import { ContractorSession, MAX_CONTRACTOR_SESSION_HOURS } from '../../models/contractorSession.model.js';
import { validateNotFutureDate, validateMinimumGap } from "../../utils/attendanceValidation.js";
import { ApiResponse } from "../../utils/ApiResponse.js";


// Record contractor punch
export const recordContractorPunch = async (req, res) => {
  try {
    const { contractorId, contractorEmployeeId, employeeName, punchType, base64Image } = req.body;
    console.log('Contractor punch request:', { contractorId, contractorEmployeeId, employeeName, punchType, base64Image });

    // Note: base64Image is optional, so we don't require it in the validation
    if (!contractorId || !contractorEmployeeId || !employeeName || !punchType) {
      console.log('Missing required fields:', { contractorId, contractorEmployeeId, employeeName, punchType });
      return res.status(400).json(new ApiResponse(400, null, 'Missing required fields: contractorId, contractorEmployeeId, employeeName, and punchType'));
    }

    // Validate contractor
    const contractor = await Contractor.findById(contractorId);
    if (!contractor) {
      console.log('Contractor not found:', contractorId);
      return res.status(404).json(new ApiResponse(404, null, 'Contractor not found'));
    }

    console.log('Contractor found:', contractor.name);

    // Asynchronous image handling function for contractors
    const handleContractorImageUploadAsync = async (imageBuffer, fileName, uploadDir, sessionModel, sessionId, imageType, contractorEmployeeId, punchType) => {
      try {
        const imagePath = path.join(uploadDir, fileName);
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`[Async Contractor] Image saved locally: ${fileName}`);

        const timestamp = Date.now();
        const publicId = `contractor-punches/${contractorEmployeeId}/${punchType}_${timestamp}`;

        console.log(`[Async Contractor] Starting Cloudinary upload for ${contractorEmployeeId}...`);
        const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
        const imageUrl = uploadResult.secure_url;

        console.log(`[Async Contractor] Cloudinary upload successful: ${imageUrl}`);

        // Update the session with the image URL
        const updateData = {};
        updateData[imageType === 'IN' ? 'inImageUrl' : 'outImageUrl'] = imageUrl;

        // Find by _id for precision
        await sessionModel.findByIdAndUpdate(sessionId, updateData);
        console.log(`[Async Contractor] Session ${sessionId} updated with ${imageType} image URL`);
      } catch (error) {
        console.error(`[Async Contractor] Error in image upload background process:`, error);
      }
    };

    // Prepare image data if provided but don't wait for upload
    let imageProcessingData = null;
    if (base64Image) {
      try {
        const base64Part = base64Image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Part, "base64");

        if (imageBuffer.length > 0) {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const uploadDir = path.join(__dirname, "..", "..", "uploads", "punch-images");

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const fileName = `contractor_${contractorEmployeeId}_${punchType}_${Date.now()}.jpg`;
          imageProcessingData = { imageBuffer, fileName, uploadDir };
        }
      } catch (e) {
        console.error("Error preparing image for async contractor upload:", e);
      }
    }

    // Handle session-based punch logic
    if (punchType.toUpperCase() === "IN") {
      // Check if contractor employee has an OPEN session
      const openSession = await ContractorSession.findOne({
        contractorId: contractorId, // Ensure we're using the correct contractorId
        contractorEmployeeId: contractorEmployeeId,
        status: 'OPEN'
      });

      if (openSession) {
        console.log('Contractor employee already has an open session:', { contractorId, contractorEmployeeId });
        return res.status(400).json(new ApiResponse(400, null, "Cannot punch IN. Contractor employee already has an open session."));
      }

      const newSession = await ContractorSession.create({
        sessionId: 0, // Temporary value, will be updated by pre-save hook
        contractorId: contractorId, // Ensure we're using the correct contractorId
        contractorEmployeeId,
        employeeName,
        inTime: new Date(),
        status: 'OPEN',
        enteredBy: 'Contractor Portal',
        inImageUrl: "" // Updated asynchronously
      });

      if (imageProcessingData && newSession._id) {
        handleContractorImageUploadAsync(
          imageProcessingData.imageBuffer,
          imageProcessingData.fileName,
          imageProcessingData.uploadDir,
          ContractorSession,
          newSession._id,
          'IN',
          contractorEmployeeId,
          punchType
        );
      }

      console.log('Contractor punch IN recorded:', newSession._id);

      // Remove the redundant ContractorPunch creation
      // The session contains all the information we need

      return res.status(201).json(new ApiResponse(201, { session: newSession }, 'Punch IN recorded successfully'));
    } else if (punchType.toUpperCase() === "OUT") {
      // Check if contractor employee has an OPEN session
      // First, try with the provided contractorId
      let openSession = await ContractorSession.findOne({
        contractorId: contractorId,
        contractorEmployeeId: contractorEmployeeId,
        status: 'OPEN'
      });

      // If not found, try to find any open session for this contractor employee
      // This handles cases where contractorId might be different but contractorEmployeeId is the same
      if (!openSession) {
        console.log('No open session found with provided contractorId, searching by contractorEmployeeId only');
        openSession = await ContractorSession.findOne({
          contractorEmployeeId: contractorEmployeeId,
          status: 'OPEN'
        });
      }

      if (!openSession) {
        console.log('No open session found for contractor employee:', { contractorId, contractorEmployeeId });

        // Debug: Check what sessions actually exist for this contractor employee
        const allSessions = await ContractorSession.find({
          contractorEmployeeId: contractorEmployeeId
        }).sort({ createdAt: -1 }).limit(5);

        console.log('Recent sessions for contractor employee:', allSessions.map(s => ({
          id: s._id,
          contractorId: s.contractorId,
          contractorEmployeeId: s.contractorEmployeeId,
          status: s.status,
          inTime: s.inTime,
          outTime: s.outTime
        })));

        return res.status(400).json(new ApiResponse(400, null, "Cannot punch OUT. No open session found for contractor employee."));
      }

      const outTime = new Date();

      // Validate minimum 5-minute gap
      const minimumGapValidation = validateMinimumGap(openSession.inTime, outTime);
      if (!minimumGapValidation.isValid) {
        console.log('Minimum gap validation failed:', minimumGapValidation.errorMessage);
        return res.status(400).json(new ApiResponse(400, null, minimumGapValidation.errorMessage));
      }

      // Close the open session
      openSession.outTime = outTime;
      openSession.status = 'CLOSED';
      // openSession.outImageUrl = imageUrl; // Updated asynchronously
      await openSession.save();

      if (imageProcessingData && openSession._id) {
        handleContractorImageUploadAsync(
          imageProcessingData.imageBuffer,
          imageProcessingData.fileName,
          imageProcessingData.uploadDir,
          ContractorSession,
          openSession._id,
          'OUT',
          contractorEmployeeId,
          punchType
        );
      }

      console.log('Contractor punch OUT recorded:', openSession._id);

      // Remove the redundant ContractorPunch creation
      // The session contains all the information we need

      return res.status(200).json(new ApiResponse(200, { session: openSession }, 'Punch OUT recorded successfully'));
    } else {
      console.log('Invalid punch type:', punchType);
      return res.status(400).json(new ApiResponse(400, null, 'Invalid punch type'));
    }
  } catch (err) {
    console.error('Contractor Punch Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};

// Get contractor punch counts
export const getContractorPunchCounts = async (req, res) => {
  try {
    const { contractorId, date, month } = req.query;
    if (!contractorId) return res.status(400).json(new ApiResponse(400, null, 'Missing contractorId'));
    // Day count
    let todayCount = 0;
    if (date) {
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      todayCount = await ContractorSession.countDocuments({
        contractorId,
        inTime: { $gte: start, $lte: end },
      });
    } else {
      // Default: today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      todayCount = await ContractorSession.countDocuments({
        contractorId,
        inTime: { $gte: today, $lt: tomorrow },
      });
    }
    // Month count
    let monthCount = 0;
    if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
      const monthEnd = new Date(Date.UTC(year, monthNum, 1));
      monthCount = await ContractorSession.countDocuments({
        contractorId,
        inTime: { $gte: monthStart, $lt: monthEnd },
      });
    } else {
      // Default: this month
      const today = new Date();
      const year = today.getFullYear();
      const monthNum = today.getMonth();
      const monthStart = new Date(year, monthNum, 1);
      const monthEnd = new Date(year, monthNum + 1, 1);
      monthCount = await ContractorSession.countDocuments({
        contractorId,
        inTime: { $gte: monthStart, $lt: monthEnd },
      });
    }
    return res.status(200).json(new ApiResponse(200, { todayCount, monthCount }, "Contractor punch counts fetched successfully"));
  } catch (err) {
    console.error('Contractor Punch Counts Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};

// Function to get contractor daily attendance with night shift handling
export const getContractorDailyAttendanceWithNightShift = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date query param (YYYY-MM-DD)" });

    const targetDate = new Date(date);
    // Extend the range to catch night shift punches
    const start = new Date(targetDate);
    start.setDate(start.getDate() - 1); // Start from previous day
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetDate);
    end.setDate(end.getDate() + 1); // End at next day
    end.setHours(23, 59, 59, 999);

    // Get all contractor sessions in the extended range to properly handle night shifts
    const sessions = await ContractorSession.find({
      $or: [
        { inTime: { $gte: start, $lte: end } },
        { outTime: { $gte: start, $lte: end } }
      ]
    }).sort({ contractorEmployeeId: 1, inTime: 1 });

    // Group sessions by contractor employee
    const employeeSessions = {};
    sessions.forEach(session => {
      if (!employeeSessions[session.contractorEmployeeId]) {
        employeeSessions[session.contractorEmployeeId] = [];
      }
      employeeSessions[session.contractorEmployeeId].push(session);
    });

    // Process each contractor employee's sessions to identify daily attendance
    const dailyAttendance = [];

    for (const [contractorEmployeeId, empSessions] of Object.entries(employeeSessions)) {
      // Get employee details from the first session
      const firstSession = empSessions[0];
      const employeeDetails = {
        empId: contractorEmployeeId,
        name: firstSession.employeeName || 'Unknown Contractor',
        department: firstSession.contractorName || 'Unknown Contractor',
        designation: 'Contractor'
      };

      // Find sessions that belong to the target date
      const sessionsForTargetDate = empSessions.filter(session => {
        const sessionDate = new Date(session.inTime);
        sessionDate.setHours(0, 0, 0, 0);
        const targetDateNormalized = new Date(targetDate);
        targetDateNormalized.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === targetDateNormalized.getTime();
      });

      // Find night shift sessions that started yesterday and end today
      const nightShiftSessionsEndingToday = empSessions.filter(session => {
        if (!session.inTime || !session.outTime) return false;

        const inDate = new Date(session.inTime);
        inDate.setHours(0, 0, 0, 0);

        const outDate = new Date(session.outTime);
        outDate.setHours(0, 0, 0, 0);

        const yesterday = new Date(targetDate);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const targetDateNormalized = new Date(targetDate);
        targetDateNormalized.setHours(0, 0, 0, 0);

        // Session started yesterday and ended today
        return inDate.getTime() === yesterday.getTime() && outDate.getTime() === targetDateNormalized.getTime();
      });

      // Find night shift sessions that start today and will end tomorrow
      const nightShiftSessionsStartingToday = empSessions.filter(session => {
        if (!session.inTime) return false;

        const inDate = new Date(session.inTime);
        inDate.setHours(0, 0, 0, 0);

        const tomorrow = new Date(targetDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const targetDateNormalized = new Date(targetDate);
        targetDateNormalized.setHours(0, 0, 0, 0);

        // Session started today and (will end tomorrow or is still open)
        return inDate.getTime() === targetDateNormalized.getTime();
      });

      // Determine attendance status
      let status = 'Absent';
      let checkIn = '';
      let checkOut = '';
      let checkInDisplay = '';
      let checkOutDisplay = '';
      let isNightShift = false;
      let checkInFromPreviousDay = false;
      let imageUrl = '';
      let inPunchId = null;
      let outPunchId = null;
      let sessionId = null;

      // Handle night shift sessions ending today (show as blank)
      if (nightShiftSessionsEndingToday.length > 0) {
        status = 'Absent'; // Show as absent since attendance was already counted yesterday
        checkIn = '';
        checkOut = '';
        checkInDisplay = '';
        checkOutDisplay = '';
        isNightShift = true;
        checkInFromPreviousDay = true;
      }
      // Handle regular sessions for the target date
      else if (sessionsForTargetDate.length > 0) {
        const session = sessionsForTargetDate[0];
        sessionId = session._id;

        // Determine status based on session data
        if (session.punchStatus) {
          status = session.punchStatus;
        } else if (session.status === 'CLOSED' && session.inTime && session.outTime) {
          status = 'Present';
        } else if (session.status === 'OPEN' && session.inTime) {
          status = 'IN Only';
        } else if (session.outTime && !session.inTime) {
          status = 'OUT Only';
        }

        // Format check-in time
        if (session.inTime) {
          const inTime = new Date(session.inTime);
          checkIn = inTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          });
          checkInDisplay = checkIn;
          imageUrl = session.inImageUrl || session.imageUrl || '';
          inPunchId = session._id;
        }

        // Format check-out time
        if (session.outTime) {
          const outTime = new Date(session.outTime);
          checkOut = outTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          });
          checkOutDisplay = checkOut;
          if (!imageUrl) {
            imageUrl = session.outImageUrl || session.imageUrl || '';
          }
          outPunchId = session._id;
        }

        isNightShift = session.isNightShift || false;
      }
      // Handle night shift sessions starting today
      else if (nightShiftSessionsStartingToday.length > 0) {
        const session = nightShiftSessionsStartingToday[0];
        sessionId = session._id;

        // Determine status based on session data
        if (session.punchStatus) {
          status = session.punchStatus;
        } else if (session.status === 'CLOSED' && session.inTime && session.outTime) {
          status = 'Present';
        } else if (session.status === 'OPEN' && session.inTime) {
          status = 'IN Only';
        } else if (session.outTime && !session.inTime) {
          status = 'OUT Only';
        }

        // Format check-in time
        if (session.inTime) {
          const inTime = new Date(session.inTime);
          checkIn = inTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          });
          checkInDisplay = checkIn;
          imageUrl = session.inImageUrl || session.imageUrl || '';
          inPunchId = session._id;
        }

        // Format check-out time if session is closed
        if (session.outTime && session.status === 'CLOSED') {
          const outTime = new Date(session.outTime);
          checkOut = outTime.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Kolkata'
          });
          checkOutDisplay = checkOut;
          if (!imageUrl) {
            imageUrl = session.outImageUrl || session.imageUrl || '';
          }
          outPunchId = session._id;
        }

        isNightShift = session.isNightShift || false;
      }

      dailyAttendance.push({
        ...employeeDetails,
        checkIn,
        checkOut,
        checkInDisplay,
        checkOutDisplay,
        status,
        leaveReason: '',
        isNightShift,
        checkInFromPreviousDay,
        imageUrl,
        inPunchId,
        outPunchId,
        sessionId
      });
    }

    res.status(200).json({ data: dailyAttendance });
  } catch (err) {
    console.error("Contractor Daily Attendance Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get contractor detailed punches
export const getContractorDetailedPunches = async (req, res) => {
  try {
    const { contractorId, contractorEmployeeId, date, month } = req.query;

    // Import ContractorSession model
    const { ContractorSession } = await import('../../models/contractorSession.model.js');

    // Allow fetching data for all contractors when no contractorId is provided
    let query = {};

    // If specific contractor ID is provided, filter by it
    if (contractorId) {
      query.contractorId = contractorId;
    }

    // If specific employee ID is provided, filter by it
    if (contractorEmployeeId) {
      query.contractorEmployeeId = contractorEmployeeId;
    }

    if (date) {
      // Get sessions for specific date
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      query.inTime = { $gte: targetDate, $lte: endDate };
    } else if (month) {
      // Get sessions for specific month
      const [year, monthNum] = month.split('-');
      const startDate = new Date(Date.UTC(parseInt(year), parseInt(monthNum) - 1, 1));
      const endDate = new Date(Date.UTC(parseInt(year), parseInt(monthNum), 1));
      endDate.setMilliseconds(endDate.getMilliseconds() - 1); // Set to last millisecond of last day of month
      query.inTime = { $gte: startDate, $lte: endDate };
    }

    const sessions = await ContractorSession.find(query)
      .sort({ contractorEmployeeId: 1, inTime: 1 })
      .lean();

    // Group sessions by employee if no specific employee requested
    if (!contractorEmployeeId) {
      const groupedSessions = {};
      if (Array.isArray(sessions)) {
        sessions.forEach(session => {
          if (!groupedSessions[session.contractorEmployeeId]) {
            groupedSessions[session.contractorEmployeeId] = [];
          }
          groupedSessions[session.contractorEmployeeId].push(session);
        });
      }
      return res.status(200).json(new ApiResponse(200, groupedSessions, "Contractor detailed sessions fetched successfully"));
    } else {
      return res.status(200).json(new ApiResponse(200, sessions, "Contractor detailed sessions fetched successfully"));
    }
  } catch (err) {
    console.error('Contractor Detailed Sessions Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};

// Get contractor employees
export const getContractorEmployees = async (req, res) => {
  try {
    const { contractorId } = req.query;
    if (!contractorId) return res.status(400).json(new ApiResponse(400, null, 'Missing contractorId'));

    // Contractor model is already imported at the top
    const contractor = await Contractor.findById(contractorId);
    if (!contractor) return res.status(404).json(new ApiResponse(404, null, 'Contractor not found'));

    // Add extra safety checks
    if (!contractor.contractorIds) {
      console.warn('Contractor has no contractorIds field:', contractor);
      return res.status(200).json(new ApiResponse(200, [], "Contractor employees fetched successfully"));
    }

    // Return contractor employees with their IDs
    // Fix: Ensure contractorIds is an array before calling map
    const employees = Array.isArray(contractor.contractorIds)
      ? contractor.contractorIds.map((empId, index) => ({
        contractorEmployeeId: empId,
        employeeName: `${contractor.name} - Employee ${index + 1}`,
        contractorId: contractor._id,
        contractorName: contractor.name
      }))
      : [];

    return res.status(200).json(new ApiResponse(200, employees, "Contractor employees fetched successfully"));
  } catch (err) {
    console.error('Get Contractor Employees Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};

// Manual contractor punch by HR
export const manualContractorPunchByHR = async (req, res) => {
  try {
    const { contractorId, contractorEmployeeId, employeeName, punchType, reason, timestamp } = req.body;

    // Validate required fields
    if (!contractorId || !contractorEmployeeId || !employeeName || !punchType || !timestamp) {
      return res.status(400).json(new ApiResponse(400, null, 'Missing required fields: contractorId, contractorEmployeeId, employeeName, punchType, timestamp'));
    }

    // Validate punch type
    if (!['IN', 'OUT'].includes(punchType.toUpperCase())) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid punch type. Must be IN or OUT'));
    }

    // Validate contractor exists
    // Contractor model is already imported at the top
    const contractor = await Contractor.findById(contractorId);
    if (!contractor) {
      return res.status(404).json(new ApiResponse(404, null, 'Contractor not found'));
    }

    // Validate contractor employee ID exists in contractor's employee list
    if (!Array.isArray(contractor.contractorIds) || !contractor.contractorIds.includes(contractorEmployeeId)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid contractor employee ID'));
    }

    // Parse timestamp
    const punchTime = new Date(timestamp);
    if (isNaN(punchTime.getTime())) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid timestamp format'));
    }

    // Check if punch is in the future
    const futureDateValidation = validateNotFutureDate(punchTime, "Punch time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json(new ApiResponse(400, null, futureDateValidation.errorMessage));
    }

    // Handle session-based punch logic for manual entries
    if (punchType.toUpperCase() === "IN") {
      // Check if contractor employee has an OPEN session
      const openSession = await ContractorSession.findOne({
        contractorId,
        contractorEmployeeId,
        status: 'OPEN'
      });

      if (openSession) {
        return res.status(400).json(new ApiResponse(400, null, "Cannot punch IN. Contractor employee already has an open session."));
      }

      // Create new session with in_time
      const newSession = await ContractorSession.create({
        sessionId: 0, // Temporary value, will be updated by pre-save hook
        contractorId,
        contractorEmployeeId,
        employeeName,
        inTime: punchTime,
        status: 'OPEN',
        enteredBy: `Manual Entry by HR - ${req.user?.empId || 'HR'}`,
        reason: reason || 'Manual Entry by HR',
        // Add image URL for manual entries
        inImageUrl: '/placeholder-manual-punch.jpg',
        imageUrl: '/placeholder-manual-punch.jpg'
      });

      // Remove the redundant ContractorPunch creation
      // The session contains all the information we need

      console.log(`Manual contractor employee punch IN created: ${employeeName} (${contractorEmployeeId}) at ${punchTime.toISOString()}`);

      return res.status(201).json(new ApiResponse(201, { session: newSession }, "Manual contractor employee punch IN added successfully"));
    } else if (punchType.toUpperCase() === "OUT") {
      // Check if contractor employee has an OPEN session
      const openSession = await ContractorSession.findOne({
        contractorId,
        contractorEmployeeId,
        status: 'OPEN'
      });

      if (!openSession) {
        return res.status(400).json(new ApiResponse(400, null, "Cannot punch OUT. No open session found for contractor employee."));
      }

      // Validate that OUT time is after IN time
      if (punchTime < openSession.inTime) {
        return res.status(400).json(new ApiResponse(400, null, "OUT time cannot be before IN time."));
      }

      // Validate minimum 5-minute gap
      const minimumGapValidation = validateMinimumGap(openSession.inTime, punchTime);
      if (!minimumGapValidation.isValid) {
        return res.status(400).json(new ApiResponse(400, null, minimumGapValidation.errorMessage));
      }

      // Close the open session
      openSession.outTime = punchTime;
      openSession.status = 'CLOSED';
      openSession.enteredBy = `Manual Entry by HR - ${req.user?.empId || 'HR'}`;
      // Add image URL for manual entries
      openSession.outImageUrl = '/placeholder-manual-punch.jpg';
      if (!openSession.imageUrl) {
        openSession.imageUrl = '/placeholder-manual-punch.jpg';
      }
      await openSession.save();

      // Remove the redundant ContractorPunch creation
      // The session contains all the information we need

      console.log(`Manual contractor employee punch OUT created: ${employeeName} (${contractorEmployeeId}) at ${punchTime.toISOString()}`);

      return res.status(200).json(new ApiResponse(200, { session: openSession }, "Manual contractor employee punch OUT added successfully"));
    }
  } catch (err) {
    console.error("Error in manualContractorPunchByHR:", err);
    return res.status(500).json(new ApiResponse(500, null, "Server error"));
  }
};

// Create contractor session (IN punch)
export const createContractorSession = async (req, res) => {
  try {
    const { contractorId, contractorEmployeeId, employeeName, inTime } = req.body;

    if (!contractorId || !contractorEmployeeId || !employeeName || !inTime) {
      return res.status(400).json(new ApiResponse(400, null, "Missing required fields: contractorId, contractorEmployeeId, employeeName and inTime"));
    }

    // Validate contractor exists
    const contractor = await Contractor.findById(contractorId);
    if (!contractor) {
      return res.status(404).json(new ApiResponse(404, null, "Contractor not found"));
    }

    // Validate timestamp is not in the future
    const punchTime = new Date(inTime);
    const futureDateValidation = validateNotFutureDate(punchTime, "Session start time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json(new ApiResponse(400, null, futureDateValidation.errorMessage));
    }

    // Check if contractor employee already has an OPEN session
    const openSession = await ContractorSession.findOne({
      contractorId,
      contractorEmployeeId,
      status: 'OPEN'
    });

    if (openSession) {
      // If there's already an open session, treat this as an OUT punch
      // Validate that OUT time is after IN time
      if (punchTime < openSession.inTime) {
        return res.status(400).json(new ApiResponse(400, null, "OUT time cannot be before IN time."));
      }

      // Validate minimum 5-minute gap
      const minimumGapValidation = validateMinimumGap(openSession.inTime, punchTime);
      if (!minimumGapValidation.isValid) {
        return res.status(400).json(new ApiResponse(400, null, minimumGapValidation.errorMessage));
      }

      // Close the open session
      openSession.outTime = punchTime;
      openSession.status = 'CLOSED';
      openSession.enteredBy = `Manual Entry by HR - ${req.user?.empId || 'HR'}`;
      await openSession.save();

      return res.status(200).json(new ApiResponse(200, { session: openSession }, "Contractor session updated successfully (converted IN to OUT)"));
    }

    // Create new session with in_time
    const newSession = await ContractorSession.create({
      sessionId: 0, // Temporary value, will be updated by pre-save hook
      contractorId,
      contractorEmployeeId,
      employeeName,
      inTime: punchTime,
      status: 'OPEN',
      enteredBy: `Manual Entry by HR - ${req.user?.empId || 'HR'}`,
      // Add image URL for manual entries
      inImageUrl: '/placeholder-manual-punch.jpg',
      imageUrl: '/placeholder-manual-punch.jpg'
    });

    return res.status(201).json(new ApiResponse(201, { session: newSession }, "Contractor session created successfully"));
  } catch (err) {
    console.error("Error in createContractorSession:", err);
    return res.status(500).json(new ApiResponse(500, null, "Server error"));
  }
};

// Update contractor session (OUT punch)
export const updateContractorSession = async (req, res) => {
  try {
    const { contractorId, contractorEmployeeId, outTime } = req.body;

    if (!contractorId || !contractorEmployeeId || !outTime) {
      return res.status(400).json(new ApiResponse(400, null, "Missing required fields: contractorId, contractorEmployeeId and outTime"));
    }

    // Validate contractor exists
    const contractor = await Contractor.findById(contractorId);
    if (!contractor) {
      return res.status(404).json(new ApiResponse(404, null, "Contractor not found"));
    }

    // Validate timestamp is not in the future
    const punchTime = new Date(outTime);
    const futureDateValidation = validateNotFutureDate(punchTime, "Session end time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json(new ApiResponse(400, null, futureDateValidation.errorMessage));
    }

    // Check if contractor employee has an OPEN session
    const openSession = await ContractorSession.findOne({
      contractorId,
      contractorEmployeeId,
      status: 'OPEN'
    });

    if (!openSession) {
      return res.status(400).json(new ApiResponse(400, null, "Cannot update session. No open session found for contractor employee."));
    }

    // Validate that OUT time is after IN time
    if (punchTime < openSession.inTime) {
      return res.status(400).json(new ApiResponse(400, null, "OUT time cannot be before IN time."));
    }

    // Validate minimum 5-minute gap
    const minimumGapValidation = validateMinimumGap(openSession.inTime, punchTime);
    if (!minimumGapValidation.isValid) {
      return res.status(400).json(new ApiResponse(400, null, minimumGapValidation.errorMessage));
    }

    // Close the open session
    openSession.outTime = punchTime;
    openSession.status = 'CLOSED';
    openSession.enteredBy = `Manual Entry by HR - ${req.user?.empId || 'HR'}`;
    // Add image URL for manual entries
    openSession.outImageUrl = '/placeholder-manual-punch.jpg';
    openSession.imageUrl = '/placeholder-manual-punch.jpg';
    await openSession.save();

    return res.status(200).json(new ApiResponse(200, { session: openSession }, "Contractor session updated successfully"));
  } catch (err) {
    console.error("Error in updateContractorSession:", err);
    return res.status(500).json(new ApiResponse(500, null, "Server error"));
  }
};

// Update contractor sessions manually (similar to updateManualMonthlyAttendanceSessions for employees)
export const updateContractorSessionsManually = async (req, res) => {
  try {
    const { sessions } = req.body;

    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json(new ApiResponse(400, null, 'Invalid sessions data'));
    }

    // Import ContractorSession model
    const { ContractorSession } = await import('../../models/contractorSession.model.js');

    const updatedSessions = [];
    const errors = [];

    for (const session of sessions) {
      try {
        let updatedSession;

        if (session.sessionId) {
          // Update existing session
          updatedSession = await ContractorSession.findOneAndUpdate(
            { sessionId: session.sessionId },
            {
              $set: {
                inTime: session.inTime ? new Date(session.inTime) : null,
                outTime: session.outTime ? new Date(session.outTime) : null,
                punchStatus: session.punchStatus,
                status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED",
                isNightShift: session.isNightShift || false,
                reason: session.reason || ""
              }
            },
            { new: true }
          );
        } else {
          // Create new session for Absent status with no existing session
          if (session.punchStatus === "Absent") {
            // For Absent status, we don't create a session, just skip
            continue;
          }

          // Create new session for Present or In Only status
          const newSessionData = {
            sessionId: 0, // Will be auto-generated
            contractorId: session.contractorId,
            contractorEmployeeId: session.contractorEmployeeId,
            employeeName: session.employeeName,
            inTime: session.inTime ? new Date(session.inTime) : null,
            outTime: session.outTime ? new Date(session.outTime) : null,
            punchStatus: session.punchStatus,
            status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED",
            isNightShift: session.isNightShift || false,
            reason: session.reason || "",
            enteredBy: "Manual Entry by HR"
          };

          updatedSession = await ContractorSession.create(newSessionData);
        }

        if (updatedSession) {
          updatedSessions.push(updatedSession);
        }
      } catch (err) {
        console.error('Error updating contractor session:', err);
        errors.push({
          sessionId: session.sessionId,
          error: err.message
        });
      }
    }

    if (errors.length > 0) {
      return res.status(207).json(new ApiResponse(207, {
        updatedSessions,
        errors
      }, "Partial success: Some sessions updated successfully"));
    }

    return res.status(200).json(new ApiResponse(200, updatedSessions, "All sessions updated successfully"));
  } catch (err) {
    console.error('Update Contractor Sessions Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};

// Delete contractor session
export const deleteContractorSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json(new ApiResponse(400, null, 'Missing sessionId'));
    }

    // Import ContractorSession model
    const { ContractorSession } = await import('../../models/contractorSession.model.js');

    // Find and delete the session
    const session = await ContractorSession.findOneAndDelete({ sessionId });

    if (!session) {
      return res.status(404).json(new ApiResponse(404, null, 'Session not found'));
    }

    return res.status(200).json(new ApiResponse(200, null, "Session deleted successfully"));
  } catch (err) {
    console.error('Delete Contractor Session Error:', err);
    return res.status(500).json(new ApiResponse(500, null, 'Server error'));
  }
};
