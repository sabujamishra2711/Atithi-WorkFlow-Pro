import path from "path";
import fs from "fs";

import { uploadPunchImageToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { ContractorPunch } from '../models/contractorPunch.model.js';
import Contractor from '../models/contractor.model.js';
import { 
  allocateLeave,
  triggerLeaveAllocation 
} from '../services/leaveAllocation.service.js';
// Import the new AttendanceSession model
import { AttendanceSession, MAX_SESSION_HOURS } from "../models/attendanceSession.model.js";
import { validateNotFutureDate, validateOutAfterIn, validateWithinSessionLimit } from "../utils/attendanceValidation.js";

// ✅ Manual punch by HR (with custom timestamp allowed)
export const manualPunchByHR = async (req, res) => {
  try {
    console.log(`[manualPunchByHR] Request received:`, req.body);
    let { employeeId, punchType, reason, timestamp } = req.body;

    if (!employeeId || !punchType || !timestamp) {
      console.log(`[manualPunchByHR] Missing required fields: employeeId=${employeeId}, punchType=${punchType}, timestamp=${timestamp}`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["IN", "OUT"].includes(punchType)) {
      console.log(`[manualPunchByHR] Invalid punch type: ${punchType}`);
      return res.status(400).json({ error: "Invalid punch type. Must be 'IN' or 'OUT'" });
    }

    console.log(`[manualPunchByHR] Looking up employee: ${employeeId}`);
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      console.log(`[manualPunchByHR] Employee ${employeeId} not found`);
      return res.status(404).json({ error: "Employee not found" });
    }
    
    console.log(`[manualPunchByHR] Employee ${employeeId} found with status: ${employee.status}`);
    // Check if employee is active (case-insensitive)
    if (employee.status.toLowerCase() !== 'active') {
      console.log(`[manualPunchByHR] Employee ${employeeId} is inactive. Status: ${employee.status}, lowercase: ${employee.status.toLowerCase()}`);
      return res.status(400).json({ error: "Cannot record punch for inactive employee" });
    }
    console.log(`[manualPunchByHR] Employee ${employeeId} is active, proceeding with punch`);
    
    // Validate timestamp is not in the future
    const punchTime = new Date(timestamp);
    const futureDateValidation = validateNotFutureDate(punchTime, "Punch time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json({ error: futureDateValidation.errorMessage });
    }
    
    // Handle session-based punch logic
    if (punchType === "IN") {
      // Check if employee has an OPEN session
      const openSession = await AttendanceSession.findOne({
        employeeId,
        status: 'OPEN'
      });
      
      if (openSession) {
        // If there's already an open session, treat this as an OUT punch
        // Validate that OUT time is not before IN time
        const punchTime = new Date(timestamp);
        const outAfterInValidation = validateOutAfterIn(openSession.inTime, punchTime);
        if (!outAfterInValidation.isValid) {
          return res.status(400).json({ error: outAfterInValidation.errorMessage });
        }
        
        // Validate that OUT time is not more than 24 hours after IN time
        const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, punchTime);
        if (!withinLimitValidation.isValid) {
          return res.status(400).json({ error: withinLimitValidation.errorMessage });
        }
        
        // Close the open session
        openSession.outTime = punchTime;
        openSession.status = 'CLOSED';
        await openSession.save();
        
        // No punch record needed, session already closed
        
        // Trigger leave allocation after punch creation
        await triggerLeaveAllocation(employeeId, punchTime);
        
        return res.status(200).json({ 
          message: "Punch OUT recorded successfully (converted from IN)", 
          session: openSession
        });
      }
      
      // Create new session with in_time
      const punchTime = new Date(timestamp);
      const newSession = await AttendanceSession.create({
        sessionId: 0, // Temporary value, will be updated by pre-save hook
        employeeId,
        inTime: punchTime,
        status: 'OPEN'
      });
      
      // No punch record needed, session already created
      
      return res.status(201).json({ 
        message: "Punch IN recorded successfully", 
        session: newSession
      });
    } else { // punchType === "OUT"
      // Check if employee has an OPEN session
      const openSession = await AttendanceSession.findOne({
        employeeId,
        status: 'OPEN'
      });
      
      if (!openSession) {
        return res.status(400).json({ 
          error: "Cannot punch OUT. No open session found for employee." 
        });
      }
      
      // Validate that OUT time is not before IN time
      const outAfterInValidation = validateOutAfterIn(openSession.inTime, punchTime);
      if (!outAfterInValidation.isValid) {
        return res.status(400).json({ error: outAfterInValidation.errorMessage });
      }
      
      // Validate that OUT time is not more than 24 hours after IN time
      const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, punchTime);
      if (!withinLimitValidation.isValid) {
        return res.status(400).json({ error: withinLimitValidation.errorMessage });
      }
      
      // Close the open session
      openSession.outTime = punchTime;
      openSession.status = 'CLOSED';
      await openSession.save();
      
      // Trigger leave allocation after punch creation
      await triggerLeaveAllocation(employeeId, punchTime);
      
      return res.status(200).json({ 
        message: "Punch OUT recorded successfully", 
        session: openSession 
      });
    }
  } catch (err) {
    console.error("Error in manualPunchByHR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getPendingPunches = async (_, res) => {
  try {
    // Return empty array since we're no longer using Punch model
    res.status(200).json({ data: [] });
  } catch (err) {
    console.error("Error fetching pending punches:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updatePunchStatus = async (req, res) => {
  try {
    // No punch status updates needed since we're no longer using Punch model
    return res.status(400).json({ error: "Punch status updates are no longer supported" });
  } catch (err) {
    console.error("Error updating punch status:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Manual OUT punch override for a specific session
export const manualOutPunchOverride = async (req, res) => {
  try {
    const { sessionId, newOutTime } = req.body;
    
    if (!sessionId || !newOutTime) {
      return res.status(400).json({ error: "Missing required fields: sessionId and newOutTime" });
    }
    
    // Find the session
    const session = await AttendanceSession.findOne({ sessionId: sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Validate new OUT time
    const outTime = new Date(newOutTime);
    if (isNaN(outTime.getTime())) {
      return res.status(400).json({ error: "Invalid date format for newOutTime" });
    }
    
    // Validate that OUT time is not before IN time
    if (outTime < session.inTime) {
      return res.status(400).json({ 
        error: "OUT time cannot be before IN time." 
      });
    }
    
    // Validate that OUT time is not more than 24 hours after IN time
    const maxOutTime = new Date(session.inTime.getTime() + (MAX_SESSION_HOURS * 60 * 60 * 1000));
    if (outTime > maxOutTime) {
      return res.status(400).json({ 
        error: `OUT time cannot be more than ${MAX_SESSION_HOURS} hours after IN time.` 
      });
    }
    
    // Update the session
    session.outTime = outTime;
    session.status = 'CLOSED';
    await session.save();
    
    // Determine if this is a night shift session
    const inTime = new Date(session.inTime);
    const inHour = inTime.getUTCHours();
    const outHour = outTime.getUTCHours();
    const isNightShift = (inHour >= 16 && inHour <= 23) && (outHour >= 0 && outHour <= 8);
    
    // Format times for display
    const formattedInTime = `${inTime.getHours().toString().padStart(2, '0')}:${inTime.getMinutes().toString().padStart(2, '0')}`;
    const formattedOutTime = `${outTime.getHours().toString().padStart(2, '0')}:${outTime.getMinutes().toString().padStart(2, '0')}`;
    
    return res.status(200).json({ 
      message: "Out punch updated successfully", 
      session: {
        ...session.toObject(),
        inTimeDisplay: formattedInTime,
        outTimeDisplay: formattedOutTime,
        isNightShift: isNightShift
      }
    });
  } catch (err) {
    console.error("Error in manualOutPunchOverride:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const recordPunch = async (req, res) => {
  try {
    const { employeeId, punchType, base64Image } = req.body;
    if (!employeeId || !punchType || !base64Image) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Try to find as employee
    const employee = await User.findOne({ empId: employeeId });
    if (employee) {
      // Check if employee is active (case-insensitive)
      if (employee.status.toLowerCase() !== 'active') {
        return res.status(400).json({ error: "Cannot record punch for inactive employee" });
      }
      
      // Handle session-based punch logic
      let punchRecord;
      
      if (punchType.toUpperCase() === "IN") {
        // Check if employee has an OPEN session
        const openSession = await AttendanceSession.findOne({
          employeeId,
          status: 'OPEN'
        });
        
        if (openSession) {
          return res.status(400).json({ 
            error: "Cannot punch IN. Employee already has an open session." 
          });
        }
        
        // Setup image saving
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadDir = path.join(__dirname, "..", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `${employeeId}_${Date.now()}.jpg`;
        const imagePath = path.join(uploadDir, fileName);
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(imagePath, imageBuffer);
        
        // Upload to Cloudinary
        const timestamp = Date.now();
        const publicId = `employee-punches/${employeeId}/IN_${timestamp}`;
        const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
        
        // Create new session with in_time
        const newSession = await AttendanceSession.create({
          sessionId: 0, // Temporary value, will be updated by pre-save hook
          employeeId,
          inTime: new Date(),
          status: 'OPEN'
        });
        
        return res.status(201).json({ 
          message: "Punch IN recorded successfully", 
          session: newSession
        });
      } else if (punchType.toUpperCase() === "OUT") {
        // Check if employee has an OPEN session
        const openSession = await AttendanceSession.findOne({
          employeeId,
          status: 'OPEN'
        });
        
        if (!openSession) {
          return res.status(400).json({ 
            error: "Cannot punch OUT. No open session found for employee." 
          });
        }
        
        // Setup image saving
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadDir = path.join(__dirname, "..", "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const fileName = `${employeeId}_${Date.now()}.jpg`;
        const imagePath = path.join(uploadDir, fileName);
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(imagePath, imageBuffer);
        
        // Upload to Cloudinary
        const timestamp = Date.now();
        const publicId = `employee-punches/${employeeId}/OUT_${timestamp}`;
        const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
        
        // Close the open session
        openSession.outTime = new Date();
        openSession.status = 'CLOSED';
        await openSession.save();
        
        // Trigger leave allocation after punch creation
        await triggerLeaveAllocation(employeeId, new Date());
        
        return res.status(200).json({ 
          message: "Punch OUT recorded successfully", 
          session: openSession
        });
      } else {
        return res.status(400).json({ error: "Invalid punch type" });
      }
    } else {
      // Try to find as contractor
      const contractor = await Contractor.findOne({ empId: employeeId });
      if (contractor) {
        // Check if contractor is active (case-insensitive)
        if (contractor.status.toLowerCase() !== 'active') {
          return res.status(400).json({ error: "Cannot record punch for inactive contractor" });
        }
        
        // Handle session-based punch logic
        let punchRecord;
        
        if (punchType.toUpperCase() === "IN") {
          // Check if contractor has an OPEN session
          const openSession = await AttendanceSession.findOne({
            employeeId,
            status: 'OPEN'
          });
          
          if (openSession) {
            return res.status(400).json({ 
              error: "Cannot punch IN. Contractor already has an open session." 
            });
          }
          
          // Setup image saving
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const uploadDir = path.join(__dirname, "..", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const fileName = `${employeeId}_${Date.now()}.jpg`;
          const imagePath = path.join(uploadDir, fileName);
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
          const imageBuffer = Buffer.from(base64Data, "base64");
          fs.writeFileSync(imagePath, imageBuffer);
          
          // Upload to Cloudinary
          const timestamp = Date.now();
          const publicId = `contractor-punches/${employeeId}/IN_${timestamp}`;
          const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
          
          // Create new session with in_time
          const newSession = await AttendanceSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId,
            inTime: new Date(),
            status: 'OPEN'
          });
          
          // Create punch record
          punchRecord = await ContractorPunch.create({
            employeeId,
            punchType: "IN",
            timestamp: new Date(),
            reason: "Contractor punch IN",
            enteredBy: "Contractor",
            status: "Pending",
            imageUrl: uploadResult.secure_url
          });
          
          return res.status(201).json({ 
            message: "Punch IN recorded successfully", 
            session: newSession,
            punch: punchRecord
          });
        } else if (punchType.toUpperCase() === "OUT") {
          // Check if contractor has an OPEN session
          const openSession = await AttendanceSession.findOne({
            employeeId,
            status: 'OPEN'
          });
          
          if (!openSession) {
            return res.status(400).json({ 
              error: "Cannot punch OUT. No open session found for contractor." 
            });
          }
          
          // Setup image saving
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const uploadDir = path.join(__dirname, "..", "uploads");
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const fileName = `${employeeId}_${Date.now()}.jpg`;
          const imagePath = path.join(uploadDir, fileName);
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
          const imageBuffer = Buffer.from(base64Data, "base64");
          fs.writeFileSync(imagePath, imageBuffer);
          
          // Upload to Cloudinary
          const timestamp = Date.now();
          const publicId = `contractor-punches/${employeeId}/OUT_${timestamp}`;
          const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
          
          // Close the open session
          openSession.outTime = new Date();
          openSession.status = 'CLOSED';
          await openSession.save();
          
          // Create punch record
          punchRecord = await ContractorPunch.create({
            employeeId,
            punchType: "OUT",
            timestamp: new Date(),
            reason: "Contractor punch OUT",
            enteredBy: "Contractor",
            status: "Pending",
            imageUrl: uploadResult.secure_url
          });
          
          // Trigger leave allocation after punch creation
          await triggerLeaveAllocation(employeeId, new Date());
          
          return res.status(200).json({ 
            message: "Punch OUT recorded successfully", 
            session: openSession,
            punch: punchRecord
          });
        } else {
          return res.status(400).json({ error: "Invalid punch type" });
        }
      } else {
        return res.status(404).json({ error: "Employee or contractor not found" });
      }
    }
  } catch (err) {
    console.error("Error in recordPunch:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Session-based functions
export const createSession = async (req, res) => {
  try {
    const { employeeId, inTime } = req.body;
    
    if (!employeeId || !inTime) {
      return res.status(400).json({ error: "Missing required fields: employeeId and inTime" });
    }
    
    // Validate employee exists and is active
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    if (employee.status.toLowerCase() !== 'active') {
      return res.status(400).json({ error: "Cannot record punch for inactive employee" });
    }
    
    // Validate timestamp is not in the future
    const punchTime = new Date(inTime);
    const futureDateValidation = validateNotFutureDate(punchTime, "Punch time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json({ error: futureDateValidation.errorMessage });
    }
    
    // Check if employee already has an OPEN session
    const openSession = await AttendanceSession.findOne({
      employeeId,
      status: 'OPEN'
    });
    
    if (openSession) {
      return res.status(400).json({ 
        error: "Cannot create session. Employee already has an open session." 
      });
    }
    
    // Create new session with in_time
    const newSession = await AttendanceSession.create({
      sessionId: 0, // Temporary value, will be updated by pre-save hook
      employeeId,
      inTime: punchTime,
      status: 'OPEN'
    });
    
    return res.status(201).json({ 
      message: "Session created successfully", 
      session: newSession
    });
  } catch (err) {
    console.error("Error in createSession:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { employeeId, outTime } = req.body;
    
    if (!employeeId || !outTime) {
      return res.status(400).json({ error: "Missing required fields: employeeId and outTime" });
    }
    
    // Validate employee exists and is active
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    if (employee.status.toLowerCase() !== 'active') {
      return res.status(400).json({ error: "Cannot record punch for inactive employee" });
    }
    
    // Check if employee has an OPEN session
    const openSession = await AttendanceSession.findOne({
      employeeId,
      status: 'OPEN'
    });
    
    if (!openSession) {
      return res.status(400).json({ 
        error: "Cannot update session. No open session found for employee." 
      });
    }
    
    // Validate timestamp is not in the future
    const punchTime = new Date(outTime);
    const futureDateValidation = validateNotFutureDate(punchTime, "Punch time");
    if (!futureDateValidation.isValid) {
      return res.status(400).json({ error: futureDateValidation.errorMessage });
    }
    
    // Validate that OUT time is not before IN time
    const outAfterInValidation = validateOutAfterIn(openSession.inTime, punchTime);
    if (!outAfterInValidation.isValid) {
      return res.status(400).json({ error: outAfterInValidation.errorMessage });
    }
    
    // Validate that OUT time is not more than 24 hours after IN time
    const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, punchTime);
    if (!withinLimitValidation.isValid) {
      return res.status(400).json({ error: withinLimitValidation.errorMessage });
    }
    
    // Close the open session
    openSession.outTime = punchTime;
    openSession.status = 'CLOSED';
    await openSession.save();
    
    // Trigger leave allocation after session creation
    await triggerLeaveAllocation(employeeId, punchTime);
    
    return res.status(200).json({ 
      message: "Session updated successfully", 
      session: openSession
    });
  } catch (err) {
    console.error("Error in updateSession:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// New session-based manual attendance update endpoint
export const updateManualMonthlyAttendanceSessions = async (req, res) => {
  try {
    const { sessions } = req.body; // Array of session objects
    
    if (!Array.isArray(sessions)) {
      return res.status(400).json({ error: "Invalid sessions array" });
    }
    
    console.log(`[updateManualMonthlyAttendanceSessions] Processing ${sessions.length} sessions`);
    
    const updatedSessions = [];
    
    for (const sessionData of sessions) {
      const { sessionId, employeeId, inTime, outTime, status, punchStatus, isNightShift } = sessionData;
      
      // Determine the actual status based on punchStatus or status field
      const actualStatus = punchStatus || status || "Absent";
      
      if (actualStatus === "Absent") {
        // For Absent status, delete the session if it exists
        if (sessionId) {
          await AttendanceSession.deleteOne({ sessionId });
        }
        // Create a placeholder session object for response
        updatedSessions.push({
          sessionId: null,
          employeeId,
          inTime: null,
          outTime: null,
          status: "CLOSED",
          punchStatus: "Absent",
          isNightShift: false
        });
        continue;
      }
      
      if ((actualStatus === "Present" || actualStatus === "In Only") && inTime) {
        let session;
        
        if (sessionId) {
          // Update existing session
          session = await AttendanceSession.findOne({ sessionId });
          if (session) {
            session.inTime = new Date(inTime);
            session.outTime = actualStatus === "Present" && outTime ? new Date(outTime) : null;
            session.status = actualStatus === "In Only" ? 'OPEN' : 'CLOSED';
            session.isNightShift = isNightShift || false;
            session.punchStatus = actualStatus; // Set the punchStatus field
            await session.save();
          } else {
            // Session not found, create new one
            session = await AttendanceSession.create({
              sessionId: 0, // Temporary value, will be updated by pre-save hook
              employeeId,
              inTime: new Date(inTime),
              outTime: actualStatus === "Present" && outTime ? new Date(outTime) : null,
              status: actualStatus === "In Only" ? 'OPEN' : 'CLOSED',
              isNightShift: isNightShift || false,
              punchStatus: actualStatus // Set the punchStatus field
            });
          }
        } else {
          // Create new session
          session = await AttendanceSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId,
            inTime: new Date(inTime),
            outTime: actualStatus === "Present" && outTime ? new Date(outTime) : null,
            status: actualStatus === "In Only" ? 'OPEN' : 'CLOSED',
            isNightShift: isNightShift || false,
            punchStatus: actualStatus // Set the punchStatus field
          });
        }
        
        updatedSessions.push(session);
      }
    }
    
    res.status(200).json({ 
      message: `Successfully processed ${updatedSessions.length} sessions`, 
      sessions: updatedSessions 
    });
  } catch (err) {
    console.error("Error in updateManualMonthlyAttendanceSessions:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateSessionManually = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { inTime, outTime, isNightShift, punchStatus } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Missing required field: sessionId" });
    }
    
    // Find the session
    const session = await AttendanceSession.findOne({ sessionId: sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Update session times if provided
    if (inTime) {
      const newInTime = new Date(inTime);
      if (isNaN(newInTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format for inTime" });
      }
      
      // Validate that new IN time is not in the future
      const futureDateValidation = validateNotFutureDate(newInTime, "IN time");
      if (!futureDateValidation.isValid) {
        return res.status(400).json({ error: futureDateValidation.errorMessage });
      }
      
      session.inTime = newInTime;
    }
    
    if (outTime) {
      const newOutTime = new Date(outTime);
      if (isNaN(newOutTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format for outTime" });
      }
      
      // Validate that new OUT time is not in the future
      const futureDateValidation = validateNotFutureDate(newOutTime, "OUT time");
      if (!futureDateValidation.isValid) {
        return res.status(400).json({ error: futureDateValidation.errorMessage });
      }
      
      // Validate that OUT time is not before IN time
      const outAfterInValidation = validateOutAfterIn(session.inTime, newOutTime);
      if (!outAfterInValidation.isValid) {
        return res.status(400).json({ error: outAfterInValidation.errorMessage });
      }
      
      // Validate that OUT time is not more than 24 hours after IN time
      const withinLimitValidation = validateWithinSessionLimit(session.inTime, newOutTime);
      if (!withinLimitValidation.isValid) {
        return res.status(400).json({ error: withinLimitValidation.errorMessage });
      }
      
      session.outTime = newOutTime;
      // Update session status based on punchStatus or set to CLOSED by default when outTime is provided
      session.status = punchStatus === "In Only" ? 'OPEN' : 'CLOSED';
    }
    
    // Update night shift flag if provided
    if (typeof isNightShift !== 'undefined') {
      session.isNightShift = isNightShift;
    }
    
    // Update punchStatus if provided
    if (punchStatus) {
      session.punchStatus = punchStatus;
      // Also update the session status based on punchStatus
      if (punchStatus === "In Only") {
        session.status = 'OPEN';
      } else if (punchStatus === "Present" || punchStatus === "Absent") {
        session.status = 'CLOSED';
      }
    }
    
    await session.save();
    
    // Remove punch record updates since we're using session-based system
    // Punch records are no longer needed
    
    return res.status(200).json({ 
      message: "Session updated successfully", 
      session: session 
    });
  } catch (err) {
    console.error("Error in updateSessionManually:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getSessionsByEmployeeAndMonth = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;
    const y = parseInt(year);
    const m = parseInt(month);
    
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }
    
    // Validate that the employee exists
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    // Calculate date range for the month
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // Last day of the month
    const daysInMonth = new Date(y, m, 0).getDate();
    
    // Fetch all sessions for this employee in the month
    // Include sessions that started in this month or ended in this month (for night shifts)
    const sessions = await AttendanceSession.find({
      employeeId,
      $or: [
        { inTime: { $gte: start, $lte: end } }, // Sessions that started in our range
        { outTime: { $gte: start, $lte: end } }, // Sessions that ended in our range
        { 
          inTime: { $lt: start }, // Sessions that started before our range
          outTime: { $gte: start, $lte: end } // But ended in our range (night shifts from previous day)
        },
        { status: 'OPEN' } // Open sessions
      ]
    });
    
    // Create a map of sessions by date for quick lookup
    const sessionMap = new Map();
    sessions.forEach(session => {
      // For sessions with inTime in this month
      if (session.inTime >= start && session.inTime <= end) {
        const dateKey = new Date(session.inTime).toISOString().split('T')[0];
        sessionMap.set(dateKey, session);
      }
      // For night shift sessions that started before this month but ended in this month
      else if (session.inTime < start && session.outTime && session.outTime >= start && session.outTime <= end) {
        const dateKey = new Date(session.outTime).toISOString().split('T')[0];
        sessionMap.set(dateKey, session);
      }
    });
    
    // Generate entries for all days of the month
    const formattedSessions = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(y, m - 1, day));
      const dateKey = date.toISOString().split('T')[0];
      
      if (sessionMap.has(dateKey)) {
        // Session exists for this day
        const session = sessionMap.get(dateKey);
        const inLocal = new Date(session.inTime);
        const inTimeFormatted = `${inLocal.getHours().toString().padStart(2, '0')}:${inLocal.getMinutes().toString().padStart(2, '0')}`;
        
        let outTimeFormatted = null;
        if (session.outTime) {
          const outLocal = new Date(session.outTime);
          outTimeFormatted = `${outLocal.getHours().toString().padStart(2, '0')}:${outLocal.getMinutes().toString().padStart(2, '0')}`;
        }
        
        // Determine if this is a night shift
        let isNightShift = false;
        if (session.outTime) {
          const outHour = new Date(session.outTime).getUTCHours();
          const inHour = new Date(session.inTime).getUTCHours();
          isNightShift = (outHour >= 0 && outHour <= 8 && inHour >= 16 && inHour <= 23);
        }
        
        // Determine punch status based on session data
        // Default to "Absent" if session.punchStatus is not found or is null/undefined
        let punchStatus = 'Absent';
        if (session.punchStatus !== undefined && session.punchStatus !== null && session.punchStatus !== '') {
          punchStatus = session.punchStatus;
        } else if (session.inTime && session.outTime) {
          punchStatus = 'Present';
        } else if (session.inTime && !session.outTime) {
          punchStatus = 'In Only';
        }
        
        // For Absent sessions, set time fields to null regardless of what's in the database
        if (punchStatus === 'Absent') {
          formattedSessions.push({
            sessionId: session.sessionId,
            employeeId: session.employeeId,
            inTime: null,
            outTime: null,
            inTimeFormatted: null,
            outTimeFormatted: null,
            status: session.status,
            isNightShift: false,
            punchStatus: punchStatus,
            date: dateKey,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          });
        } else {
          formattedSessions.push({
            sessionId: session.sessionId,
            employeeId: session.employeeId,
            inTime: session.inTime,
            outTime: session.outTime,
            inTimeFormatted,
            outTimeFormatted,
            status: session.status,
            isNightShift: session.isNightShift || isNightShift,
            punchStatus: punchStatus,
            date: dateKey,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          });
        }
      } else {
        // No session for this day, create an absent entry
        formattedSessions.push({
          sessionId: null,
          employeeId: employeeId,
          inTime: null,
          outTime: null,
          inTimeFormatted: null,
          outTimeFormatted: null,
          status: 'CLOSED',
          isNightShift: false,
          punchStatus: 'Absent', // Default to "Absent"
          date: dateKey, // Add date field for frontend
          createdAt: null,
          updatedAt: null
        });
      }
    }
    
    return res.status(200).json({ sessions: formattedSessions });
  } catch (err) {
    console.error("Error in getSessionsByEmployeeAndMonth:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getRecentManualPunchesByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date query param (YYYY-MM-DD)" });
    const start = new Date(date + 'T00:00:00.000Z');
    const end = new Date(date + 'T23:59:59.999Z');
    // Manual sessions: those with a non-empty reason
    const sessions = await AttendanceSession.find({
      inTime: { $gte: start, $lte: end },
      reason: { $exists: true, $ne: null, $ne: "" }
    }).sort({ inTime: -1 });
    res.status(200).json({ data: sessions });
  } catch (err) {
    console.error("Error fetching recent manual sessions by date:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const cleanupDuplicatePunches = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.body;
    
    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ error: "Employee ID, start date, and end date are required" });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Find all sessions for the employee in the date range
    const sessions = await AttendanceSession.find({
      employeeId,
      inTime: { $gte: start, $lte: end }
    }).sort({ inTime: 1 });
    
    console.log(`[cleanupDuplicatePunches] Found ${sessions.length} sessions for employee ${employeeId}`);
    
    // Group by date
    const sessionGroups = {};
    for (const session of sessions) {
      const dateStr = session.inTime.toISOString().slice(0, 10);
      if (!sessionGroups[dateStr]) {
        sessionGroups[dateStr] = [];
      }
      sessionGroups[dateStr].push(session);
    }
    
    // Remove duplicates, keeping the highest priority one
    let deletedCount = 0;
    for (const [key, sessionList] of Object.entries(sessionGroups)) {
      if (sessionList.length > 1) {
        // Sort by priority: LEAVE > Manual Entry > Auto Session
        const priority = {
          'LEAVE': 3,
          'Manual Entry by HR': 2,
          'Auto Session': 1
        };
        
        sessionList.sort((a, b) => {
          const aPriority = priority[a.reason] || 0;
          const bPriority = priority[b.reason] || 0;
          return bPriority - aPriority; // Higher priority first
        });
        
        // Keep the first one (highest priority), delete the rest
        const toDelete = sessionList.slice(1);
        for (const session of toDelete) {
          await AttendanceSession.findByIdAndDelete(session._id);
          deletedCount++;
        }
        
        console.log(`[cleanupDuplicatePunches] Deleted ${toDelete.length} duplicate sessions for ${key}`);
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} duplicate session records`,
      deletedCount 
    });
    
  } catch (err) {
    console.error("[cleanupDuplicatePunches]", err);
    res.status(500).json({ error: "Failed to cleanup duplicate sessions" });
  }
};