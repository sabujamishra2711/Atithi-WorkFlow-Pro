// attendanceCalculator.js
// Shared utility for attendance calculation

/**
 * Calculate daily attendance for an employee for a given month.
 * @param {Object} params
 * @param {string} params.empId
 * @param {Date} params.monthStart - First day of the month
 * @param {Date} params.monthEnd - Last day of the month
 * @param {Array} params.punches - Array of punch objects for the employee
 * @param {Array<string>} params.holidays - Array of YYYY-MM-DD strings for PH
 * @param {string} params.weeklyOff - e.g. 'Sunday'
 * @param {number} params.workHoursPerDay - e.g. 8, 9, 12
 * @returns {Array} Array of daily records: { date, status, checkIn, checkOut, otHours }
 */
function calculateAttendance({ empId, monthStart, monthEnd, punches, holidays, weeklyOff, workHoursPerDay }) {
  const days = [];
  const daysInMonth = (monthEnd.getDate() - monthStart.getDate()) + 1;
  for (let d = 0; d < daysInMonth; d++) {
    const dateObj = new Date(monthStart);
    dateObj.setDate(monthStart.getDate() + d);
    const dateStr = dateObj.toISOString().slice(0, 10);
    // 1. PH
    if (holidays.includes(dateStr)) {
      days.push({ date: dateStr, status: 'PH', checkIn: null, checkOut: null, otHours: 0 });
      continue;
    }
    // 2. Weekly Off
    if (weeklyOff && dateObj.toLocaleString('en-US', { weekday: 'long' }) === weeklyOff) {
      days.push({ date: dateStr, status: 'WO', checkIn: null, checkOut: null, otHours: 0 });
      continue;
    }
    // 3. Punches
    const punchesForDay = punches.filter(p => new Date(p.timestamp).toISOString().slice(0, 10) === dateStr);
    const inPunches = punchesForDay.filter(p => p.punchType.toLowerCase() === 'in');
    const outPunches = punchesForDay.filter(p => p.punchType.toLowerCase() === 'out');
    const earliestIn = inPunches.length > 0 ? new Date(Math.min(...inPunches.map(p => new Date(p.timestamp)))) : null;
    const latestOut = outPunches.length > 0 ? new Date(Math.max(...outPunches.map(p => new Date(p.timestamp)))) : null;
    let status = 'A';
    let checkIn = null;
    let checkOut = null;
    let otHours = 0;
    if (earliestIn && latestOut) {
      checkIn = earliestIn.toTimeString().slice(0,5);
      checkOut = latestOut.toTimeString().slice(0,5);
      const hours = (latestOut - earliestIn) / (1000 * 60 * 60);
      status = hours >= (workHoursPerDay || 8) ? 'P' : 'P/2';
      otHours = Math.max(0, hours - (workHoursPerDay || 8));
    } else if (earliestIn || latestOut) {
      status = 'P/2';
      checkIn = earliestIn ? earliestIn.toTimeString().slice(0,5) : null;
      checkOut = latestOut ? latestOut.toTimeString().slice(0,5) : null;
      otHours = 0;
    }
    days.push({ date: dateStr, status, checkIn, checkOut, otHours: otHours.toFixed(1) });
  }
  return days;
}

module.exports = { calculateAttendance };
