import { User } from "../../models/user.model.js";
import { AttendanceSession, MAX_SESSION_HOURS } from "../../models/attendanceSession.model.js";
import { validateNotFutureDate, validateOutAfterIn, validateWithinSessionLimit, validateMinimumGap } from "../../utils/attendanceValidation.js";
import { triggerLeaveAllocation } from "../../services/leaveAllocation.service.js";

// Function to get daily attendance with night shift handling
export const getDailyAttendanceWithNightShift = async (req, res) => {
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

    // Get all sessions in the extended range to properly handle night shifts
    const sessions = await AttendanceSession.find({
      $or: [
        { inTime: { $gte: start, $lte: end } },
        { outTime: { $gte: start, $lte: end } }
      ]
    }).sort({ employeeId: 1, inTime: 1 });

    // Group sessions by employee
    const employeeSessions = {};
    sessions.forEach(session => {
      if (!employeeSessions[session.employeeId]) {
        employeeSessions[session.employeeId] = [];
      }
      employeeSessions[session.employeeId].push(session);
    });

    // Process each employee's sessions to identify daily attendance
    const dailyAttendance = [];

    for (const [employeeId, empSessions] of Object.entries(employeeSessions)) {
      // Get employee details
      const employee = await User.findOne({ empId: employeeId });

      // Define the target date range in Asia/Kolkata timezone
      const targetDateStart = new Date(date);
      targetDateStart.setHours(0, 0, 0, 0);
      const targetDateEnd = new Date(date);
      targetDateEnd.setHours(23, 59, 59, 999);

      // Check if this employee has any night shift session that STARTS on the target date
      // We need to show these employees on the day they started their shift
      const sessionsStartingOnTargetDate = empSessions.filter(session => {
        if (!session.inTime) return false;
        const inTime = new Date(session.inTime);
        return inTime >= targetDateStart && inTime <= targetDateEnd;
      });

      // Check if this employee has any night shift session that ENDS on the target date
      // These employees should NOT appear on today's attendance (they appear on the IN date instead)
      const nightShiftSessionsEndingToday = empSessions.filter(session => {
        // Only consider sessions that have both IN and OUT times
        if (!session.inTime || !session.outTime) return false;

        const inTime = new Date(session.inTime);
        const outTime = new Date(session.outTime);

        // Check if IN and OUT are on different dates
        const inDate = inTime.toISOString().slice(0, 10);
        const outDate = outTime.toISOString().slice(0, 10);

        // Check if this is a night shift session that ends today
        return inDate !== outDate && outDate === targetDateStart.toISOString().slice(0, 10);
      });

      // Filter out the night shift sessions that end today from processing
      // But continue processing other sessions for this employee
      let sessionsToProcess = empSessions.filter(session => {
        // Keep sessions that are not night shift sessions ending today
        return !nightShiftSessionsEndingToday.includes(session);
      });

      // If no sessions to process, skip this employee
      if (sessionsToProcess.length === 0) {
        continue;
      }

      // Process all relevant sessions for this employee
      for (const targetSession of sessionsToProcess) {
        // Check if this session is relevant for the target date
        const inTime = targetSession.inTime ? new Date(targetSession.inTime) : null;
        const outTime = targetSession.outTime ? new Date(targetSession.outTime) : null;

        // Skip sessions that don't have an IN time
        if (!inTime) {
          continue;
        }

        // Check if this session is relevant for the target date
        let isRelevant = false;

        // Session is relevant if:
        // 1. IN time is on the target date
        if (inTime >= targetDateStart && inTime <= targetDateEnd) {
          isRelevant = true;
        }
        // 2. OUT time is on the target date (and IN time is before target date)
        else if (outTime && outTime >= targetDateStart && outTime <= targetDateEnd && inTime < targetDateStart) {
          isRelevant = true;
        }
        // 3. IN time is before target date and there's no OUT time (open session from previous day)
        else if (inTime < targetDateStart && !outTime) {
          isRelevant = true;
        }

        if (!isRelevant) {
          continue;
        }

        let checkInTime = inTime;
        let checkOutTime = outTime;
        let isNightShift = false;
        let checkInFromPreviousDay = false;

        if (checkInTime && checkOutTime) {
          // Check if this is a night shift (IN and OUT on different dates)
          const inDate = checkInTime.toISOString().slice(0, 10);
          const outDate = checkOutTime.toISOString().slice(0, 10);
          isNightShift = inDate !== outDate;
        } else if (checkInTime && checkInTime < targetDateStart) {
          // If session started before target date and hasn't ended yet
          checkInFromPreviousDay = true;
        }

        // Format times for display with Asia/Kolkata timezone
        let checkInDisplay = checkInTime ? checkInTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }) : '—';

        let checkOutDisplay = checkOutTime ? checkOutTime.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        }) : '—';

        // Add night shift indicator
        if (isNightShift) {
          if (checkInTime) {
            checkInDisplay += ' (night shift)';
          }
          if (checkOutTime) {
            checkOutDisplay += ' (night shift)';
          }
        }

        // Determine status
        let status = 'Absent';
        if (checkInTime && checkOutTime) {
          status = 'Present';
        } else if (checkInTime) {
          status = 'IN Only';
        } else if (checkOutTime) {
          status = 'OUT Only';
        }

        // Find corresponding punch records to get image URLs
        let imageUrl = '';
        // Use the appropriate image URL based on the session status
        if (targetSession.outTime) {
          // If session is complete (has OUT time), use OUT image URL
          imageUrl = targetSession.outImageUrl || '';
        } else {
          // If session is incomplete (no OUT time), use IN image URL
          imageUrl = targetSession.inImageUrl || '';
        }

        // Use session IDs instead of punch IDs since we're using AttendanceSession model directly
        let inPunchId = targetSession.inTime ? targetSession._id.toString() : null;
        let outPunchId = targetSession.outTime ? targetSession._id.toString() : null;

        // Note: Since we've removed the Punch model, we'll use session IDs for delete operations
        // In a real implementation, you might store image URLs directly in the AttendanceSession model

        // Determine if this is a manual entry
        const isManualEntry = targetSession.reason && targetSession.reason.trim() !== "";

        dailyAttendance.push({
          empId: employeeId, // Changed from employeeId to match frontend type
          name: employee ? `${employee.firstName} ${employee.lastName}` : employeeId,
          department: employee?.department || 'N/A',
          designation: employee?.position || 'N/A', // Add designation (position) field
          checkIn: checkInDisplay, // Use display format to match frontend expectations
          checkOut: checkOutDisplay, // Use display format to match frontend expectations
          checkInDisplay,
          checkOutDisplay,
          status,
          isNightShift,
          checkInFromPreviousDay, // Add this field
          imageUrl, // Add imageUrl to the response
          inPunchId, // Add inPunchId to the response (now using session ID)
          outPunchId, // Add outPunchId to the response (now using session ID)
          sessionId: targetSession.sessionId, // Add sessionId to the response
          // Add indicator for manual vs regular punches
          entryType: isManualEntry ? "Manual" : "Regular"
        });
      }
    }

    res.status(200).json({ data: dailyAttendance });
  } catch (err) {
    console.error("Error in getDailyAttendanceWithNightShift:", err);
    res.status(500).json({ error: "Server error" });
  }
};

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
        // Store the reason for manual entry
        if (reason) {
          openSession.reason = reason;
        }
        await openSession.save();

        // No punch record needed, session already closed

        // Trigger leave allocation after punch creation
        await triggerLeaveAllocation(employeeId, punchTime);

        return res.status(200).json({
          message: "Punch OUT recorded successfully (converted from IN)",
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
        // Store the reason for manual entry
        reason: reason || "",
        inImageUrl: "" // Manual punches don't have images
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
      // Store the reason for manual entry
      if (reason) {
        openSession.reason = reason;
      }
      openSession.outImageUrl = ""; // Manual punches don't have images
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

    // Validate minimum 5-minute gap
    const minimumGapValidation = validateMinimumGap(session.inTime, outTime);
    if (!minimumGapValidation.isValid) {
      return res.status(400).json({ error: minimumGapValidation.errorMessage });
    }

    // Validate that OUT time is not more than 24 hours after IN time
    const maxOutTime = new Date(session.inTime.getTime() + (MAX_SESSION_HOURS * 60 * 60 * 1000));
    if (outTime > maxOutTime) {
      return res.status(400).json({
        error: `OUT time cannot be more than ${MAX_SESSION_HOURS} hours after IN time.`
      });
    }

    // Update the session and set punchStatus
    session.outTime = outTime;
    session.status = 'CLOSED';
    session.punchStatus = 'Present'; // Set punchStatus for completed sessions
    await session.save();

    // Determine if this is a night shift session
    const inTime = new Date(session.inTime);
    const inHour = inTime.getUTCHours();
    const outHour = outTime.getUTCHours();
    const isNightShift = (inHour >= 16 && inHour <= 23) && (outHour >= 0 && outHour <= 8);

    // Format times for display
    const formattedInTime = inTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
    const formattedOutTime = outTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });

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

export const getManualMonthlyAttendance = async (req, res) => {
  try {
    // Return empty data since we're no longer using Punch model
    res.status(200).json({ data: {} });
  } catch (err) {
    console.error("Error fetching manual monthly attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateManualMonthlyAttendance = async (req, res) => {
  try {
    // No manual monthly attendance updates needed since we're no longer using Punch model
    return res.status(400).json({ error: "Manual monthly attendance updates are no longer supported" });
  } catch (err) {
    console.error("Error updating manual monthly attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};