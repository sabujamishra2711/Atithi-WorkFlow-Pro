import cron from 'node-cron';
import { autoCloseSessions } from '../controllers/cron.controller.js';

// Auto-close sessions every hour
const autoCloseJob = cron.schedule('0 * * * *', async () => {
  try {
    console.log('Running auto-close sessions job...');
    await autoCloseSessions({}, {
      status: (code) => ({ json: (data) => console.log('Auto-close response:', data) })
    });
  } catch (error) {
    console.error('Error in auto-close sessions job:', error);
  }
});

export { autoCloseJob };