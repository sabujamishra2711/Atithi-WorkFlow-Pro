/**
 * Validation utilities for attendance session operations
 */

import { MAX_SESSION_HOURS } from "../models/attendanceSession.model.js";

/**
 * Validate that a date is not in the future
 * @param {Date} date - The date to validate
 * @param {string} fieldName - The name of the field for error messages
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateNotFutureDate = (date, fieldName) => {
  if (date > new Date()) {
    return {
      isValid: false,
      errorMessage: `${fieldName} cannot be in the future`
    };
  }
  return { isValid: true };
};

/**
 * Validate that OUT time is not before IN time
 * @param {Date} inTime - The IN time
 * @param {Date} outTime - The OUT time
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateOutAfterIn = (inTime, outTime) => {
  if (outTime < inTime) {
    return {
      isValid: false,
      errorMessage: "OUT time cannot be before IN time"
    };
  }
  return { isValid: true };
};

/**
 * Validate that OUT time is not more than 24 hours after IN time
 * @param {Date} inTime - The IN time
 * @param {Date} outTime - The OUT time
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateWithinSessionLimit = (inTime, outTime) => {
  const maxOutTime = new Date(inTime.getTime() + (MAX_SESSION_HOURS * 60 * 60 * 1000));
  if (outTime > maxOutTime) {
    return {
      isValid: false,
      errorMessage: `OUT time cannot be more than ${MAX_SESSION_HOURS} hours after IN time`
    };
  }
  return { isValid: true };
};

/**
 * Validate that there is at least a 5-minute gap between IN and OUT times
 * @param {Date} inTime - The IN time
 * @param {Date} outTime - The OUT time
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateMinimumGap = (inTime, outTime) => {
  // Calculate the time difference in minutes
  const timeDiff = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
  
  // Check if the gap is less than 5 minutes
  if (timeDiff < 5) {
    return {
      isValid: false,
      errorMessage: "There must be at least a 5-minute gap between IN and OUT punches"
    };
  }
  return { isValid: true };
};

/**
 * Validate session data
 * @param {Object} session - The attendance session
 * @returns {Object} - Validation result with isValid and errorMessage
 */
export const validateSession = (session) => {
  // Check if session has required fields
  if (!session.employeeId) {
    return {
      isValid: false,
      errorMessage: "Session must have an employee ID"
    };
  }
  
  if (!session.inTime) {
    return {
      isValid: false,
      errorMessage: "Session must have an IN time"
    };
  }
  
  // Validate IN time is not in future
  const inTimeValidation = validateNotFutureDate(session.inTime, "IN time");
  if (!inTimeValidation.isValid) {
    return inTimeValidation;
  }
  
  // If OUT time exists, validate it
  if (session.outTime) {
    // Validate OUT time is not in future
    const outTimeValidation = validateNotFutureDate(session.outTime, "OUT time");
    if (!outTimeValidation.isValid) {
      return outTimeValidation;
    }
    
    // Validate OUT time is after IN time
    const outAfterInValidation = validateOutAfterIn(session.inTime, session.outTime);
    if (!outAfterInValidation.isValid) {
      return outAfterInValidation;
    }
    
    // Validate minimum 5-minute gap
    const minimumGapValidation = validateMinimumGap(session.inTime, session.outTime);
    if (!minimumGapValidation.isValid) {
      return minimumGapValidation;
    }
    
    // Validate OUT time is within session limit
    const withinLimitValidation = validateWithinSessionLimit(session.inTime, session.outTime);
    if (!withinLimitValidation.isValid) {
      return withinLimitValidation;
    }
  }
  
  return { isValid: true };
};

export default {
  validateNotFutureDate,
  validateOutAfterIn,
  validateWithinSessionLimit,
  validateMinimumGap,
  validateSession
};