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
import { validateNotFutureDate, validateOutAfterIn, validateWithinSessionLimit } from "../utils/attendanceValidation.js";

// Function to handle automatic session creation when punching OUT without an open session
export const recordPunchWithAutoSession = async (req, res) => {
  try {
    const { employeeId, punchType, autoCreateSession = false } = req.body;
    // Remove base64Image since it's no longer used
    if (!employeeId || !punchType) {
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
        
        // If no open session and autoCreateSession is true, create a new session first
        if (!openSession && autoCreateSession) {
          // Create new session with in_time (current time)
          const newSession = await AttendanceSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId,
            inTime: new Date(),
            status: 'OPEN'
          });
          
          // Now proceed with the OUT punch
          // Close the newly created session
          newSession.outTime = new Date();
          newSession.status = 'CLOSED';
          await newSession.save();
          
          // Trigger leave allocation after punch creation
          await triggerLeaveAllocation(employeeId, new Date());
          
          return res.status(200).json({ 
            message: "Punch OUT recorded successfully with auto-created session", 
            session: newSession
          });
        } else if (!openSession) {
          // No open session and autoCreateSession is false
          return res.status(400).json({ 
            error: "Cannot punch OUT. No open session found for employee." 
          });
        } else {
          // There is an open session, proceed with normal OUT punch
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
        }
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
        
        // Handle session-based punch logic for contractors
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
          
          // Create new session with in_time
          const newSession = await AttendanceSession.create({
            sessionId: 0, // Temporary value, will be updated by pre-save hook
            employeeId,
            inTime: new Date(),
            status: 'OPEN'
          });
          
          return res.status(201).json({ 
            message: "Contractor Punch IN recorded successfully", 
            session: newSession
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
          
          // Close the open session
          openSession.outTime = new Date();
          openSession.status = 'CLOSED';
          await openSession.save();
          
          return res.status(200).json({ 
            message: "Contractor Punch OUT recorded successfully", 
            session: openSession
          });
        } else {
          return res.status(400).json({ error: "Invalid punch type" });
        }
      } else {
        return res.status(404).json({ error: "Employee or contractor not found" });
      }
    }
  } catch (err) {
    console.error("Error in recordPunchWithAutoSession:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
