import cron from 'node-cron';
import { AttendanceSession } from '../models/attendanceSession.model.js';

// Run every hour to check for expired sessions
const scheduleAttendanceSessionCleanup = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Running attendance session cleanup job...');
      const closedSessions = await AttendanceSession.autoCloseExpiredSessions();
      console.log(`Auto-closed ${closedSessions.length} attendance sessions`);
    } catch (error) {
      console.error('Error in attendance session cleanup job:', error);
    }
  });
};

export default scheduleAttendanceSessionCleanup;