/**
 * Utility functions for handling punch operations
 */

/**
 * Determines if a punch time represents a night shift scenario
 * @param {Date} punchTime - The punch timestamp
 * @returns {boolean} - True if this is a night shift punch
 */
export const isNightShiftPunch = (punchTime) => {
  const hour = punchTime.getUTCHours();
  // Night shift punches are typically:
  // - IN punches in late evening (16-23 hours)
  // - OUT punches in early morning (0-8 hours)
  return (hour >= 16 && hour <= 23) || (hour >= 0 && hour <= 8);
};

/**
 * Adjusts punch time for night shift scenarios
 * @param {Date} punchTime - The original punch timestamp
 * @param {string} punchType - The type of punch ("IN" or "OUT")
 * @returns {Date} - The adjusted punch timestamp
 */
export const adjustNightShiftPunchTime = (punchTime, punchType) => {
  const adjustedTime = new Date(punchTime);
  
  // For OUT punches in early morning (0-8 AM UTC), shift to next day
  if (punchType === "OUT" && punchTime.getUTCHours() >= 0 && punchTime.getUTCHours() <= 8) {
    adjustedTime.setUTCDate(adjustedTime.getUTCDate() + 1);
  }
  
  // For IN punches in late evening (16-23 PM UTC), this belongs to current day
  // No adjustment needed for IN punches
  
  return adjustedTime;
};

/**
 * Checks if two punches represent a valid session (IN before OUT)
 * @param {Date} inTime - The IN punch timestamp
 * @param {Date} outTime - The OUT punch timestamp
 * @returns {boolean} - True if this is a valid session
 */
export const isValidPunchSession = (inTime, outTime) => {
  // Normal case: OUT is after IN
  if (outTime > inTime) {
    return true;
  }
  
  // Night shift case: OUT is early morning of next day, IN is late evening
  const inHour = inTime.getUTCHours();
  const outHour = outTime.getUTCHours();
  
  // IN in evening (16-23) and OUT in early morning (0-8) of next day
  if (inHour >= 16 && inHour <= 23 && outHour >= 0 && outHour <= 8) {
    // Check if OUT is indeed on the next day
    const inDate = new Date(inTime);
    const outDate = new Date(outTime);
    inDate.setUTCHours(0, 0, 0, 0);
    outDate.setUTCHours(0, 0, 0, 0);
    const dayDifference = (outDate - inDate) / (1000 * 60 * 60 * 24);
    
    // Should be exactly 1 day difference for night shift
    return dayDifference === 1;
  }
  
  return false;
};

/**
 * Finds matching IN punch for an OUT punch in night shift scenarios
 * @param {Array} punches - Array of punch records
 * @param {Date} outTime - The OUT punch timestamp
 * @param {string} employeeId - The employee ID
 * @returns {Object|null} - The matching IN punch or null
 */
export const findMatchingInPunch = (punches, outTime, employeeId) => {
  // Filter for IN punches from the same employee
  const inPunches = punches.filter(p => 
    p.punchType === "IN" && 
    p.employeeId === employeeId
  );
  
  // Check if OUT time is in early morning (night shift scenario)
  const outHour = outTime.getUTCHours();
  if (outHour >= 0 && outHour <= 8) {
    // Look for IN punch from previous day in evening
    const targetDate = new Date(outTime);
    targetDate.setUTCDate(targetDate.getUTCDate() - 1);
    
    for (const inPunch of inPunches) {
      const inTime = new Date(inPunch.timestamp);
      const inHour = inTime.getUTCHours();
      
      // Check if IN punch is from previous day and in evening hours
      if (inHour >= 16 && inHour <= 23) {
        // Check if dates match (IN on previous day, OUT on current day)
        const inDate = new Date(inTime);
        const outDate = new Date(outTime);
        inDate.setUTCHours(0, 0, 0, 0);
        outDate.setUTCHours(0, 0, 0, 0);
        const expectedInDate = new Date(outDate);
        expectedInDate.setUTCDate(expectedInDate.getUTCDate() - 1);
        
        if (inDate.getTime() === expectedInDate.getTime()) {
          return inPunch;
        }
      }
    }
  }
  
  return null;
};

export default {
  isNightShiftPunch,
  adjustNightShiftPunchTime,
  isValidPunchSession,
  findMatchingInPunch
};