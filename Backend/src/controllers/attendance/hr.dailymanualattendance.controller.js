import { User } from "../../models/user.model.js";
import { AttendanceSession, MAX_SESSION_HOURS } from "../../models/attendanceSession.model.js";
import { validateNotFutureDate, validateOutAfterIn, validateWithinSessionLimit } from "../../utils/attendanceValidation.js";
import { triggerLeaveAllocation } from "../../services/leaveAllocation.service.js";

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
      const punchTime = new Date(timestamp);
      const newSession = await AttendanceSession.create({
        sessionId: 0, // Temporary value, will be updated by pre-save hook
        employeeId,
        inTime: punchTime,
        status: 'OPEN',
        punchStatus: 'In Only', // Set punchStatus for IN only sessions
        // Store the reason for manual entry
        reason: reason || ""
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
      // Store the reason for manual entry
      if (reason) {
        openSession.reason = reason;
      }
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
    
    // Create date range for the entire day, handling both local and UTC times
    const [year, month, day] = date.split('-').map(Number);
    
    // Create start and end times in local timezone
    const startLocal = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endLocal = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    console.log(`[getRecentManualPunchesByDate] Searching for entries`);
    console.log(`[getRecentManualPunchesByDate] Local range: ${startLocal.toISOString()} to ${endLocal.toISOString()}`);
    
    // Get ALL sessions for the date (both regular and manual)
    const sessions = await AttendanceSession.find({
      inTime: { $gte: startLocal, $lte: endLocal }
    }).sort({ inTime: -1 });
    
    // Transform sessions to match frontend expectations
    const transformedSessions = sessions.map(session => {
      // Determine if this is a manual entry (has reason) or regular punch (no reason)
      const isManualEntry = session.reason && session.reason.trim() !== "";
      
      // Format times with Asia/Kolkata timezone
      const inTime = session.inTime ? new Date(session.inTime) : null;
      const outTime = session.outTime ? new Date(session.outTime) : null;
      
      const inTimeDisplay = inTime ? inTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) : '—';
      
      const outTimeDisplay = outTime ? outTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) : '—';
      
      return {
        ...session.toObject(),
        punchType: session.outTime ? "OUT" : "IN",
        timestamp: session.inTime,
        status: isManualEntry ? "Manual Entry" : (session.outTime ? "Present" : "In Only"),
        inTimeDisplay,
        outTimeDisplay,
        // Add indicator for manual vs regular punches
        entryType: isManualEntry ? "Manual" : "Regular"
      };
    });
    
    console.log(`[getRecentManualPunchesByDate] Found ${sessions.length} entries`);
    
    res.status(200).json({ data: transformedSessions });
  } catch (err) {
    console.error("Error fetching recent sessions by date:", err);
    res.status(500).json({ error: "Server error" });
  }
};

