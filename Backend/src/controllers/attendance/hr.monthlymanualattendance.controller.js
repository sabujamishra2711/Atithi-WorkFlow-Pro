import { AttendanceSession } from "../../models/attendanceSession.model.js";
import { User } from "../../models/user.model.js";

// Get manual monthly attendance for an employee
export const getManualMonthlyAttendance = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "Missing required parameters: employeeId, year, month" });
    }

    // Create date range for the month
    const startDate = new Date(Date.UTC(year, month - 1, 1)); // month is 0-indexed in Date constructor
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of the month

    // Find all sessions for this employee in the specified month (both regular and manual)
    const sessions = await AttendanceSession.find({
      employeeId: employeeId,
      $or: [
        { inTime: { $gte: startDate, $lte: endDate } },
        { outTime: { $gte: startDate, $lte: endDate } }
      ]
    }).sort({ inTime: 1 });

    // Create an array of all days in the month
    const daysInMonth = new Date(year, month, 0).getDate();
    const attendanceData = [];

    // Process each day
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(Date.UTC(year, month - 1, day));
      const nextDate = new Date(Date.UTC(year, month - 1, day + 1));

      // Find sessions that apply to this day
      const daySessions = sessions.filter(session => {
        const inTime = session.inTime ? new Date(session.inTime) : null;
        const outTime = session.outTime ? new Date(session.outTime) : null;

        // Session that started on this day
        if (inTime && inTime >= currentDate && inTime < nextDate) {
          return true;
        }

        // Session that ended on this day
        if (outTime && outTime >= currentDate && outTime < nextDate) {
          return true;
        }

        // Session that spans this day (started before and ends after)
        if (inTime && outTime && inTime < currentDate && outTime >= nextDate) {
          return true;
        }

        return false;
      });

      // Determine attendance status for this day
      let punchStatus = "Absent";
      let inTime = null;
      let outTime = null;
      let sessionId = null;
      let isNightShift = false;
      let entryType = "None"; // Track if this is a manual or regular entry

      if (daySessions.length > 0) {
        const session = daySessions[0]; // Take the first session
        sessionId = session.sessionId;

        if (session.inTime) {
          inTime = new Date(session.inTime);
        }

        if (session.outTime) {
          outTime = new Date(session.outTime);
        }

        // Determine if this is a manual entry
        const isManualEntry = session.reason && session.reason.trim() !== "";
        entryType = isManualEntry ? "Manual" : "Regular";

        // Determine status based on session data
        if (session.punchStatus) {
          punchStatus = session.punchStatus;
        } else if (inTime && outTime) {
          punchStatus = "Present";
        } else if (inTime) {
          punchStatus = "In Only";
        }

        // Check for night shift
        if (inTime && outTime) {
          const inDate = inTime.getUTCDate();
          const outDate = outTime.getUTCDate();
          isNightShift = inDate !== outDate;
        }
      }

      // Format times for display
      const inTimeDisplay = inTime ? inTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) : null;

      const outTimeDisplay = outTime ? outTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      }) : null;

      attendanceData.push({
        date: currentDate.toISOString().split('T')[0],
        day: day,
        punchStatus,
        inTime: inTimeDisplay,
        outTime: outTimeDisplay,
        sessionId,
        isNightShift,
        entryType // Add entry type to distinguish manual vs regular punches
      });
    }

    res.status(200).json({ data: attendanceData });
  } catch (err) {
    console.error("Error fetching manual monthly attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Update manual monthly attendance for an employee
export const updateManualMonthlyAttendance = async (req, res) => {
  try {
    // No manual monthly attendance updates needed since we're no longer using Punch model
    return res.status(400).json({ error: "Manual monthly attendance updates are no longer supported" });
  } catch (err) {
    console.error("Error updating manual monthly attendance:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Update manual monthly attendance sessions
export const updateManualMonthlyAttendanceSessions = async (req, res) => {
  try {
    const { sessions } = req.body;

    if (!sessions || !Array.isArray(sessions)) {
      return res.status(400).json({ error: "Invalid sessions data. Expected an array of session objects." });
    }

    console.log(`[updateManualMonthlyAttendanceSessions] Processing ${sessions.length} sessions`);

    // Process each session
    const processedSessions = [];
    const errors = [];

    for (const session of sessions) {
      try {
        // Validate required fields
        if (!session.employeeId) {
          errors.push(`Session missing employeeId: ${JSON.stringify(session)}`);
          continue;
        }

        // Handle Absent status - delete existing session if it exists
        if (session.punchStatus === "Absent") {
          console.log(`[updateManualMonthlyAttendanceSessions] Handling absent session for employee ${session.employeeId} on ${session.date}`);

          // Check if session already exists
          let existingSession = null;
          if (session.sessionId && session.sessionId !== null) {
            // If sessionId is provided, try to find existing session
            existingSession = await AttendanceSession.findOne({ sessionId: session.sessionId });
          } else {
            // If no sessionId, try to find session by employeeId and date
            if (session.date) {
              const date = new Date(session.date);
              // Create start and end of day in UTC to properly match sessions
              const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
              const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

              existingSession = await AttendanceSession.findOne({
                employeeId: session.employeeId,
                inTime: { $gte: startOfDay, $lte: endOfDay }
              });
            }
          }

          // If existing session found, delete it
          if (existingSession) {
            console.log(`[updateManualMonthlyAttendanceSessions] Deleting existing session ${existingSession.sessionId} for employee ${session.employeeId}`);
            await AttendanceSession.deleteOne({ sessionId: existingSession.sessionId });
            processedSessions.push({
              ...session,
              message: "Existing session deleted successfully"
            });
          } else {
            // No existing session to delete
            processedSessions.push({
              ...session,
              message: "Absent session - no existing session to delete"
            });
          }
          continue;
        }

        // Validate time formats if present
        let inTime = null;
        let outTime = null;

        if (session.inTime) {
          inTime = new Date(session.inTime);
          if (isNaN(inTime.getTime())) {
            errors.push(`Invalid inTime format for employee ${session.employeeId}: ${session.inTime}`);
            continue;
          }
        }

        if (session.outTime) {
          outTime = new Date(session.outTime);
          if (isNaN(outTime.getTime())) {
            errors.push(`Invalid outTime format for employee ${session.employeeId}: ${session.outTime}`);
            continue;
          }
        }

        // Validate that employee exists and is active
        const employee = await User.findOne({ empId: session.employeeId });
        if (!employee) {
          errors.push(`Employee not found: ${session.employeeId}`);
          continue;
        }

        if (employee.status.toLowerCase() !== 'active') {
          errors.push(`Cannot record attendance for inactive employee: ${session.employeeId}`);
          continue;
        }

        // For Present status, both inTime and outTime are required
        if (session.punchStatus === "Present" && (!inTime || !outTime)) {
          errors.push(`Present session missing inTime or outTime for employee ${session.employeeId}`);
          continue;
        }

        // For In Only status, inTime is required
        if (session.punchStatus === "In Only" && !inTime) {
          errors.push(`In Only session missing inTime for employee ${session.employeeId}`);
          continue;
        }

        // Check if session already exists
        let existingSession = null;
        if (session.sessionId && session.sessionId !== null) {
          // If sessionId is provided, try to find existing session
          existingSession = await AttendanceSession.findOne({ sessionId: session.sessionId });
        } else {
          // If no sessionId, try to find session by employeeId and date
          if (session.date) {
            const date = new Date(session.date);
            // Create start and end of day in UTC to properly match sessions
            const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
            const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

            existingSession = await AttendanceSession.findOne({
              employeeId: session.employeeId,
              inTime: { $gte: startOfDay, $lte: endOfDay }
            });
          }
        }

        let savedSession;
        if (existingSession) {
          // Update existing session
          console.log(`[updateManualMonthlyAttendanceSessions] Updating existing session ${existingSession.sessionId} for employee ${session.employeeId}`);

          // Update fields
          if (inTime) {
            existingSession.inTime = inTime;
          }
          if (outTime) {
            existingSession.outTime = outTime;
          }
          existingSession.status = session.punchStatus === "In Only" ? "OPEN" : "CLOSED";
          existingSession.punchStatus = session.punchStatus;
          existingSession.isNightShift = session.isNightShift || false;

          // Add reason for manual entry
          existingSession.reason = "Manual Entry by HR";

          savedSession = await existingSession.save();
        } else {
          // Create new session
          console.log(`[updateManualMonthlyAttendanceSessions] Creating new session for employee ${session.employeeId}`);

          // Prepare session data with temporary sessionId (will be updated by pre-save hook)
          const newSessionData = {
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId: session.employeeId,
            status: session.punchStatus === "In Only" ? "OPEN" : "CLOSED",
            punchStatus: session.punchStatus,
            isNightShift: session.isNightShift || false,
            reason: "Manual Entry by HR"
          };

          // Only set inTime and outTime if they exist
          if (inTime) {
            newSessionData.inTime = inTime;
          } else {
            // If no inTime is provided, create a default one (start of the day)
            const date = new Date(session.date);
            newSessionData.inTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9, 0, 0)); // Default to 9:00 AM
          }

          if (outTime) {
            newSessionData.outTime = outTime;
          } else if (session.punchStatus === "Present") {
            // If no outTime is provided for Present status, create a default one (end of the day)
            const date = new Date(session.date);
            newSessionData.outTime = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 17, 0, 0)); // Default to 5:00 PM
          }

          // Create new session using create() method (sessionId will be auto-generated)
          const newSession = await AttendanceSession.create(newSessionData);
          savedSession = newSession;
        }

        processedSessions.push({
          ...session,
          sessionId: savedSession.sessionId,
          message: existingSession ? "Session updated successfully" : "Session created successfully"
        });
      } catch (sessionError) {
        console.error(`[updateManualMonthlyAttendanceSessions] Error processing session:`, sessionError);
        errors.push(`Error processing session for employee ${session.employeeId}: ${sessionError.message}`);
      }
    }

    // Return response
    if (errors.length > 0) {
      console.log(`[updateManualMonthlyAttendanceSessions] Completed with ${errors.length} errors`);
      return res.status(207).json({
        message: `Processed ${processedSessions.length} sessions with ${errors.length} errors`,
        processedSessions,
        errors
      });
    } else {
      console.log(`[updateManualMonthlyAttendanceSessions] All sessions processed successfully`);
      return res.status(200).json({
        message: `All ${processedSessions.length} sessions processed successfully`,
        processedSessions
      });
    }
  } catch (err) {
    console.error("Error in updateManualMonthlyAttendanceSessions:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Export manual monthly attendance as PDF
export const exportManualMonthlyAttendancePDF = async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;

    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "Missing required parameters: employeeId, year, month" });
    }

    // Check if data is provided in the request body (from frontend)
    if (req.body && req.body.data) {
      // Use the data provided by the frontend
      const pdfData = req.body.data;

      // Import PDF generation utility
      const { generateManualAttendancePDF } = await import("../../utils/pdfGenerator.js");

      // Generate and send PDF
      generateManualAttendancePDF(pdfData, res);
      return;
    }

    // If no data provided, fetch from database (fallback method)
    // Import PDF generation utility
    const { generateManualAttendancePDF } = await import("../../utils/pdfGenerator.js");

    // Get employee info
    const employee = await User.findOne({ empId: employeeId });
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get attendance data by calling the existing function
    // Create a mock request and response to get the attendance data
    const mockReq = {
      params: { employeeId, year, month }
    };

    // Use a promise to capture the response data
    const attendanceResult = await new Promise((resolve, reject) => {
      const mockRes = {
        status: function (code) {
          this.statusCode = code;
          if (code >= 400) {
            this.error = true;
          }
          return this;
        },
        json: function (data) {
          if (this.error) {
            reject(data);
          } else {
            resolve(data);
          }
          return this;
        }
      };

      // Call the existing controller function
      getManualMonthlyAttendance(mockReq, mockRes);
    });

    // Prepare data for PDF generation
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const pdfData = {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      year,
      month,
      monthName: monthNames[parseInt(month) - 1],
      attendance: attendanceResult.data
    };

    // Generate and send PDF
    generateManualAttendancePDF(pdfData, res);
  } catch (err) {
    console.error("Manual attendance PDF export error:", err);
    // Check if headers have already been sent
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error", details: err.message });
    }
  }
};
