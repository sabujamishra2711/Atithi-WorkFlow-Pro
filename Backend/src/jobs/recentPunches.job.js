import cron from 'node-cron';
import { getFlatRecentPunches } from '../controllers/punch.controller.js';

// Mock response object for the getFlatRecentPunches function
const createMockRes = () => {
  const mockRes = {
    status: (code) => {
      mockRes.statusCode = code;
      return mockRes;
    },
    json: (data) => {
      mockRes.jsonData = data;
      return mockRes;
    }
  };
  return mockRes;
};

// Function to call the recent punches API
const fetchRecentPunches = async () => {
  try {
    console.log('[Recent Punches Job] Starting API call at:', new Date().toISOString());

    // Call the recent punches function directly
    const mockRes = createMockRes();
    await getFlatRecentPunches({}, mockRes);

    console.log('[Recent Punches Job] API call successful at:', new Date().toISOString());
    console.log('[Recent Punches Job] Response status:', mockRes.statusCode);
    console.log('[Recent Punches Job] Data length:', mockRes.jsonData?.data?.length || 0);

    return mockRes.jsonData;
  } catch (error) {
    console.error('[Recent Punches Job] Error calling API:', error.message);
    return null;
  }
};

// Schedule the job to run every 5 minutes
const scheduleRecentPunchesJob = () => {
  console.log('[Recent Punches Job] Scheduling job to run every 5 minutes');

  // Run immediately when starting
  fetchRecentPunches();

  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await fetchRecentPunches();
  });

  console.log('[Recent Punches Job] Job scheduled successfully');
};

export default scheduleRecentPunchesJob;