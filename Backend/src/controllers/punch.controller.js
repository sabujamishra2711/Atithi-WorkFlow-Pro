import path from "path";
import fs from "fs";

import { uploadPunchImageToCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Contractor from '../models/contractor.model.js';
import {
  allocateLeave,
  triggerLeaveAllocation
} from '../services/leaveAllocation.service.js';
// Import the new AttendanceSession model
import { AttendanceSession, MAX_SESSION_HOURS } from "../models/attendanceSession.model.js";
// Import ContractorSession model
import { ContractorSession } from "../models/contractorSession.model.js";
import { validateNotFutureDate, validateOutAfterIn, validateWithinSessionLimit, validateMinimumGap } from "../utils/attendanceValidation.js";

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

export const recordPunch = async (req, res) => {
  try {
    const { employeeId, punchType, base64Image } = req.body;
    if (!employeeId || !punchType) {
      return res.status(400).json({ error: "Missing required fields: employeeId and punchType" });
    }

    // Asynchronous image handling function
    const handleImageUploadAsync = async (imageBuffer, fileName, uploadDir, sessionModel, sessionId, imageType, isEmployee) => {
      try {
        const imagePath = path.join(uploadDir, fileName);
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`[Async] Image saved locally: ${fileName}`);

        const timestamp = Date.now();
        const folder = isEmployee ? 'employee-punches' : 'contractor-punches';
        const publicId = `${folder}/${employeeId}/${punchType}_${timestamp}`;

        console.log(`[Async] Starting Cloudinary upload for ${employeeId}...`);
        const uploadResult = await uploadPunchImageToCloudinary(imagePath, publicId);
        const imageUrl = uploadResult.secure_url;

        console.log(`[Async] Cloudinary upload successful: ${imageUrl}`);

        // Update the session with the image URL
        const updateData = {};
        updateData[imageType === 'IN' ? 'inImageUrl' : 'outImageUrl'] = imageUrl;

        await sessionModel.findOneAndUpdate({ sessionId }, updateData);
        console.log(`[Async] Session ${sessionId} updated with ${imageType} image URL`);
      } catch (error) {
        console.error(`[Async] Error in image upload background process:`, error);
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
          const uploadDir = path.join(__dirname, "..", "uploads", "punch-images");

          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const fileName = `punch_${employeeId}_${punchType}_${Date.now()}.jpg`;
          imageProcessingData = { imageBuffer, fileName, uploadDir };
        }
      } catch (e) {
        console.error("Error preparing image for async upload:", e);
      }
    }

    // Try to find as employee
    const employee = await User.findOne({ empId: employeeId });
    if (employee) {
      // Check if employee is active (case-insensitive)
      if (employee && employee.status.toLowerCase() !== 'active') {
        return res.status(400).json({ error: "Cannot record punch for inactive employee" });
      }


      // Handle session-based punch logic
      // Check if employee has an OPEN session
      const openSession = await AttendanceSession.findOne({
        employeeId,
        status: 'OPEN'
      });

      if (!openSession) {
        // No open session exists - this must be an IN punch
        // Create new session with in_time and punchStatus
        const newSession = await AttendanceSession.create({
          sessionId: 0, // Temporary value, will be updated by pre-save hook
          employeeId,
          inTime: new Date(),
          status: 'OPEN',
          punchStatus: 'In Only', // Set punchStatus for IN only sessions
          inImageUrl: "" // Initially empty, will be updated asynchronously if image provided
        });


        // Actually, we need to get the real sessionId after creation
        // mongoose create returns the doc
        if (imageProcessingData && newSession.sessionId) {
          // Replace the previous call with one using the real sessionId
          handleImageUploadAsync(
            imageProcessingData.imageBuffer,
            imageProcessingData.fileName,
            imageProcessingData.uploadDir,
            AttendanceSession,
            newSession.sessionId,
            'IN',
            true
          );
        }

        return res.status(201).json({
          message: "Punch IN recorded successfully",
          session: newSession
        });
      } else {
        // Open session exists - check if it has exceeded 25 hours
        if (openSession.hasExceededMaxHours()) {
          // Auto-close the expired session
          openSession.autoClose();
          await openSession.save();

          // Create a new IN session
          // Create new session with in_time and punchStatus
          const newSession = await AttendanceSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId,
            inTime: new Date(),
            status: 'OPEN',
            punchStatus: 'In Only', // Set punchStatus for IN only sessions
            inImageUrl: "" // Updated asynchronously
          });

          if (imageProcessingData && newSession.sessionId) {
            handleImageUploadAsync(
              imageProcessingData.imageBuffer,
              imageProcessingData.fileName,
              imageProcessingData.uploadDir,
              AttendanceSession,
              newSession.sessionId,
              'IN',
              true
            );
          }

          return res.status(201).json({
            message: "Previous session auto-closed. New Punch IN recorded successfully",
            session: newSession
          });
        } else {
          // Session is still within 25 hours - this must be an OUT punch
          const outTime = new Date();

          // Validate minimum 5-minute gap
          const minimumGapValidation = validateMinimumGap(openSession.inTime, outTime);
          if (!minimumGapValidation.isValid) {
            return res.status(400).json({ error: minimumGapValidation.errorMessage });
          }

          // Validate that OUT time is not before IN time
          const outAfterInValidation = validateOutAfterIn(openSession.inTime, outTime);
          if (!outAfterInValidation.isValid) {
            return res.status(400).json({ error: outAfterInValidation.errorMessage });
          }

          // Validate that OUT time is not more than 24 hours after IN time
          const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, outTime);
          if (!withinLimitValidation.isValid) {
            return res.status(400).json({ error: withinLimitValidation.errorMessage });
          }

          // Close the open session and update punchStatus
          openSession.outTime = outTime;
          openSession.status = 'CLOSED';
          openSession.punchStatus = 'Present'; // Set punchStatus for completed sessions
          // openSession.outImageUrl = imageUrl; // Updated asynchronously
          await openSession.save();

          if (imageProcessingData && openSession.sessionId) {
            handleImageUploadAsync(
              imageProcessingData.imageBuffer,
              imageProcessingData.fileName,
              imageProcessingData.uploadDir,
              AttendanceSession,
              openSession.sessionId,
              'OUT',
              true
            );
          }

          // Trigger leave allocation after punch creation
          await triggerLeaveAllocation(employeeId, outTime);

          return res.status(200).json({
            message: "Punch OUT recorded successfully",
            session: openSession
          });
        }
      }
    } else {
      // Try to find as contractor
      const contractor = await Contractor.findOne({ contractorIds: employeeId });
      if (contractor) {
        // Check if contractor is active (case-insensitive) - Safe check
        const contractorStatus = contractor.status ? contractor.status.toLowerCase() : 'active';
        if (contractorStatus !== 'active') {
          return res.status(400).json({ error: "Cannot record punch for inactive contractor" });
        }

        // Contractor image handling (already handled by common imageProcessingData at top)

        // Handle session-based punch logic for contractors
        // Check if contractor has an OPEN session
        // Use contractor._id as the contractorId for consistency
        const openSession = await ContractorSession.findOne({
          contractorId: contractor._id,
          contractorEmployeeId: employeeId,
          status: 'OPEN'
        });

        if (!openSession) {
          // No open session exists - this must be an IN punch
          // Create new session with in_time and punchStatus
          const newSession = await ContractorSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            contractorId: contractor._id, // Use contractor._id for consistency
            contractorEmployeeId: employeeId,
            employeeName: contractor.name,
            inTime: new Date(),
            status: 'OPEN',
            punchStatus: 'In Only', // Set punchStatus for IN only sessions
            enteredBy: 'Contractor Portal',
            inImageUrl: "" // Updated asynchronously
          });

          if (imageProcessingData && newSession.sessionId) {
            handleImageUploadAsync(
              imageProcessingData.imageBuffer,
              imageProcessingData.fileName,
              imageProcessingData.uploadDir,
              ContractorSession,
              newSession.sessionId,
              'IN',
              false
            );
          }

          return res.status(201).json({
            message: "Contractor Punch IN recorded successfully",
            session: newSession
          });
        } else {
          // Open session exists - check if it has exceeded 25 hours
          if (openSession.hasExceededMaxHours()) {
            // Auto-close the expired session
            openSession.autoClose();
            await openSession.save();

            // Create a new IN session
            // Create new session with in_time and punchStatus
            const newSession = await ContractorSession.create({
              sessionId: 0, // Temporary value, will be updated by pre-save hook
              contractorId: contractor._id, // Use contractor._id for consistency
              contractorEmployeeId: employeeId,
              employeeName: contractor.name,
              inTime: new Date(),
              status: 'OPEN',
              punchStatus: 'In Only', // Set punchStatus for IN only sessions
              enteredBy: 'Contractor Portal',
              inImageUrl: "" // Updated asynchronously
            });

            if (imageProcessingData && newSession.sessionId) {
              handleImageUploadAsync(
                imageProcessingData.imageBuffer,
                imageProcessingData.fileName,
                imageProcessingData.uploadDir,
                ContractorSession,
                newSession.sessionId,
                'IN',
                false
              );
            }

            return res.status(201).json({
              message: "Previous session auto-closed. New Contractor Punch IN recorded successfully",
              session: newSession
            });
          } else {
            // Session is still within 25 hours - this must be an OUT punch
            const outTime = new Date();

            // Validate minimum 5-minute gap
            const minimumGapValidation = validateMinimumGap(openSession.inTime, outTime);
            if (!minimumGapValidation.isValid) {
              return res.status(400).json({ error: minimumGapValidation.errorMessage });
            }

            // Validate that OUT time is not before IN time
            const outAfterInValidation = validateOutAfterIn(openSession.inTime, outTime);
            if (!outAfterInValidation.isValid) {
              return res.status(400).json({ error: outAfterInValidation.errorMessage });
            }

            // Validate that OUT time is not more than 24 hours after IN time
            const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, outTime);
            if (!withinLimitValidation.isValid) {
              return res.status(400).json({ error: withinLimitValidation.errorMessage });
            }

            // Close the open session and update punchStatus
            openSession.outTime = outTime;
            openSession.status = 'CLOSED';
            openSession.punchStatus = 'Present'; // Set punchStatus for completed sessions
            openSession.enteredBy = 'Contractor Portal';
            // openSession.outImageUrl = imageUrl; // Updated asynchronously
            await openSession.save();

            if (imageProcessingData && openSession.sessionId) {
              handleImageUploadAsync(
                imageProcessingData.imageBuffer,
                imageProcessingData.fileName,
                imageProcessingData.uploadDir,
                ContractorSession,
                openSession.sessionId,
                'OUT',
                false
              );
            }

            // Trigger leave allocation after punch creation (if needed for contractors)
            // await triggerLeaveAllocation(employeeId, outTime);

            return res.status(200).json({
              message: "Contractor Punch OUT recorded successfully",
              session: openSession
            });
          }
        }
      } else {
        return res.status(404).json({ error: "Employee or contractor not found" });
      }
    }
  } catch (err) {
    console.error("Error in recordPunch:", err);
    // Don't leak internal error details but log them
    return res.status(500).json({
      error: "Server error during punch recording",
      details: err.message
    });
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
      // If there's already an open session, treat this as an OUT punch
      // Validate that OUT time is not before IN time
      const outAfterInValidation = validateOutAfterIn(openSession.inTime, punchTime);
      if (!outAfterInValidation.isValid) {
        return res.status(400).json({ error: outAfterInValidation.errorMessage });
      }

      // Validate minimum 5-minute gap
      const minimumGapValidation = validateMinimumGap(openSession.inTime, punchTime);
      if (!minimumGapValidation.isValid) {
        return res.status(400).json({ error: minimumGapValidation.errorMessage });
      }

      // Validate that OUT time is not more than 24 hours after IN time
      const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, punchTime);
      if (!withinLimitValidation.isValid) {
        return res.status(400).json({ error: withinLimitValidation.errorMessage });
      }

      // Close the open session and update punchStatus
      openSession.outTime = punchTime;
      openSession.status = 'CLOSED';
      openSession.punchStatus = 'Present'; // Set punchStatus for completed sessions
      openSession.outImageUrl = ""; // Sessions updated without images
      await openSession.save();

      // Trigger leave allocation after session creation
      await triggerLeaveAllocation(employeeId, punchTime);

      return res.status(200).json({
        message: "Session updated successfully (converted IN to OUT)",
        session: openSession
      });
    }

    // Create new session with in_time and punchStatus
    const newSession = await AttendanceSession.create({
      sessionId: 0, // Temporary value, will be updated by pre-save hook
      employeeId,
      inTime: punchTime,
      status: 'OPEN',
      punchStatus: 'In Only', // Set punchStatus for IN only sessions
      inImageUrl: "" // Sessions created without images
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

    // Validate minimum 5-minute gap
    const minimumGapValidation = validateMinimumGap(openSession.inTime, punchTime);
    if (!minimumGapValidation.isValid) {
      return res.status(400).json({ error: minimumGapValidation.errorMessage });
    }

    // Validate that OUT time is not more than 24 hours after IN time
    const withinLimitValidation = validateWithinSessionLimit(openSession.inTime, punchTime);
    if (!withinLimitValidation.isValid) {
      return res.status(400).json({ error: withinLimitValidation.errorMessage });
    }

    // Close the open session and update punchStatus
    openSession.outTime = punchTime;
    openSession.status = 'CLOSED';
    openSession.punchStatus = 'Present'; // Set punchStatus for completed sessions
    openSession.outImageUrl = ""; // Sessions updated without images
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
      const { sessionId, employeeId, inTime, outTime, status, punchStatus, isNightShift, date } = sessionData;

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
          isNightShift: false,
          date: date
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

        // Add date field to the response
        updatedSessions.push({
          ...session.toObject(),
          date: date
        });
      } else if (actualStatus === "Absent") {
        // For Absent status, make sure session is deleted if it exists
        if (sessionId) {
          await AttendanceSession.deleteOne({ sessionId });
        }
        updatedSessions.push({
          sessionId: null,
          employeeId,
          inTime: null,
          outTime: null,
          status: "CLOSED",
          punchStatus: "Absent",
          isNightShift: false,
          date: date
        });
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

      // Validate minimum 5-minute gap
      const minimumGapValidation = validateMinimumGap(session.inTime, newOutTime);
      if (!minimumGapValidation.isValid) {
        return res.status(400).json({ error: minimumGapValidation.errorMessage });
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

/**
 * Get sessions for an employee for a specific month
 * @param {Object} req - Request object with employeeId, year, and month in params
 * @param {Object} res - Response object
 * @returns {Promise} - Promise with the sessions data
 */
export const getSessionsByEmployeeAndMonth = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate year and month
    if (!year || !month || isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ error: "Invalid year or month" });
    }

    // Calculate date range for the month
    const start = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59));

    // Get all sessions for the employee in the month
    // Include sessions that started in this month or previous month but ended in this month (for night shifts)
    const sessions = await AttendanceSession.find({
      employeeId,
      $or: [
        { inTime: { $gte: start, $lte: end } }, // Sessions that started in our range
        {
          inTime: { $lt: start }, // Sessions that started before our range
          outTime: { $gte: start, $lte: end } // But ended in our range (night shifts from previous day)
        }
      ]
    }).sort({ inTime: 1 });

    // Format sessions with proper date field
    const formattedSessions = sessions.map(session => {
      return {
        sessionId: session.sessionId,
        employeeId: session.employeeId,
        inTime: session.inTime,
        outTime: session.outTime,
        status: session.status,
        punchStatus: session.punchStatus || "Absent",
        isNightShift: session.isNightShift || false,
        date: session.inTime ? new Date(session.inTime).toISOString().split('T')[0] : null
      };
    });

    res.status(200).json({ data: formattedSessions });
  } catch (err) {
    console.error("[getSessionsByEmployeeAndMonth] Error:", err);
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

// Additional functions needed by the routes
export const deletePunch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Missing punch ID" });
    }

    // Find and delete the attendance session by ID
    // The ID being passed is actually a session ID, not a punch ID
    const session = await AttendanceSession.findByIdAndDelete(id);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.status(200).json({ message: "Session deleted successfully" });
  } catch (err) {
    console.error("Error deleting session:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getFlatRecentPunches = async (_, res) => {
  try {
    // Get recent sessions (last 25 hours) and format them for display
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    // Get recent employee sessions
    const recentEmployeeSessions = await AttendanceSession.find({
      inTime: { $gte: twentyFiveHoursAgo }
    })
      .sort({ inTime: -1 })
      .limit(25);

    // Get recent contractor sessions
    const recentContractorSessions = await ContractorSession.find({
      inTime: { $gte: twentyFiveHoursAgo }
    })
      .sort({ inTime: -1 })
      .limit(25);

    // Combine and sort all sessions by inTime
    const allSessions = [
      ...recentEmployeeSessions.map(session => ({ ...session.toObject(), type: 'employee' })),
      ...recentContractorSessions.map(session => ({ ...session.toObject(), type: 'contractor' }))
    ].sort((a, b) => new Date(b.inTime) - new Date(a.inTime))
      .slice(0, 50); // Limit to 50 most recent

    // Format sessions for frontend display
    const formattedSessions = allSessions.map(session => {
      const inTime = session.inTime ? new Date(session.inTime) : null;
      const outTime = session.outTime ? new Date(session.outTime) : null;

      // Determine if this is a manual entry (has reason) or regular punch (no reason)
      const isManualEntry = session.reason && session.reason.trim() !== "";

      // Determine which image URL to use
      let imageUrl = '';
      if (session.outTime) {
        // If session is complete (has OUT time), use OUT image URL
        imageUrl = session.outImageUrl || '';
      } else {
        // If session is incomplete (no OUT time), use IN image URL
        imageUrl = session.inImageUrl || '';
      }

      // Determine employee ID based on type
      const employeeId = session.type === 'contractor'
        ? session.contractorEmployeeId
        : session.employeeId;

      // Determine punch type (IN/OUT) based on whether outTime exists
      const punchType = session.outTime ? 'OUT' : 'IN';

      return {
        id: session._id,
        sessionId: session.sessionId,
        employeeId: employeeId,
        inTime: inTime ? inTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }) : null,
        outTime: outTime ? outTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }) : null,
        status: session.status,
        punchType: punchType,
        punchStatus: session.punchStatus || (session.outTime ? 'Present' : 'In Only'),
        createdAt: session.createdAt,
        imageUrl: imageUrl, // Add image URL to the response
        // Add indicator for manual vs regular punches
        entryType: isManualEntry ? "Manual" : "Regular"
      };
    });

    res.status(200).json({ data: formattedSessions });
  } catch (err) {
    console.error("Error fetching flat recent punches:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getPunchesByDate = async (req, res) => {
  try {
    // Return empty array since we're no longer using Punch model
    res.status(200).json({ data: [] });
  } catch (err) {
    console.error("Error fetching punches by date:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Monthly attendance functions have been moved to hr.monthlyattendance.controller.js

// Export the function from the new controller
export { getDailyAttendanceWithNightShift } from "./attendance/hr.dailyattendance.controller.js";

// Contractor functions have been moved to hr.contractorattendance.controller.js
// recordContractorPunch, getContractorPunchCounts, getContractorDetailedPunches,
// getContractorEmployees, manualContractorPunchByHR
