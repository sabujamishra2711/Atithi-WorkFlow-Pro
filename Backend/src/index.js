// require('dotenv').config({Path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from './app.js'
import cron from 'node-cron';
import { User } from './models/user.model.js';
import { Leave } from './models/leave.model.js';
import { Payment } from './models/payment.model.js';

import secureEnvLoader from "./utils/secureEnvLoader.js";
import { monthlyJob, yearEndJob } from './scripts/cron.jobs.js';
import { autoCloseJob } from './scripts/session.cron.js';
import scheduleRecentPunchesJob from './jobs/recentPunches.job.js';
import leavePolicyMain from './scripts/leave-policy-automation.js'; // Import our new leave policy automation

// Load environment variables securely
try {
  // First try secure loader
  if (!secureEnvLoader.isLoaded()) {
    // Fallback to dotenv for development
    dotenv.config({ path: './.env' });
    console.log('⚠️ Using fallback environment loading');
  }
} catch (error) {
  console.error('❌ Environment loading failed:', error.message);
  // Don't exit in development, just use dotenv
  dotenv.config({ path: './.env' });
}

// Ensure we're using the PORT from environment variables
const PORT = process.env.PORT || 8000; // Default to 8002 if not set

const APP_VERSION = process.env.APP_VERSION || '1.0.0';

console.log(`🔧 Configured PORT: ${PORT}`);
console.log(`🔧 Environment PORT variable: ${process.env.PORT}`);

// Function to perform version and payment checks
async function performStartupChecks() {
  try {
    console.log('🔄 Performing startup checks...');

    // Check version
    const paymentRecord = await Payment.findOne();
    if (paymentRecord) {
      const versionMatch = paymentRecord.version === APP_VERSION;
      console.log(`✅ Version Check: ${versionMatch ? 'Versions match' : 'Version mismatch detected'}`);

      if (!versionMatch) {
        console.warn(`⚠️  Version mismatch - App: ${APP_VERSION}, DB: ${paymentRecord.version}`);
      }
    } else {
      console.log('ℹ️  No payment record found');
    }

    console.log('✅ Startup checks completed');
  } catch (error) {
    console.error('❌ Error during startup checks:', error.message);
  }
}

connectDB()
  .then(async () => {
    // Perform startup checks after DB connection
    await performStartupChecks();

    // Bind to all interfaces (0.0.0.0) for Render compatibility
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running at PORT : ${PORT}`)
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    })

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  })
  .catch((error) => {          // Start server even if DB connection fails
    console.log("🔄 Starting server without database connection...");
    console.error("Database connection error:", error);
    // Bind to all interfaces (0.0.0.0) for Render compatibility
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`⚠️  Server is running at PORT : ${PORT} (No Database)`)
      console.log("   Frontend will work for UI testing")
      console.log("   Install MongoDB to enable full functionality")
      console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    })

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });
  })

// Start cron jobs
monthlyJob.start();
yearEndJob.start();
autoCloseJob.start();
// Start the recent punches job to keep Render service active
scheduleRecentPunchesJob();
// Start our new leave policy automation cron jobs
leavePolicyMain().catch(error => {
  console.error('Error starting leave policy automation:', error);
});

// Import and start the image cleanup job
import { initImageCleanupSchedule } from './jobs/cleanupPunchImages.job.js';
initImageCleanupSchedule();

export default app;

// Helper function to get all Sundays in a year
function getSundaysInYear(year) {
  const sundays = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() + 1);
  }
  while (startDate <= endDate) {
    sundays.push(new Date(startDate));
    startDate.setDate(startDate.getDate() + 7);
  }
  return sundays;
}