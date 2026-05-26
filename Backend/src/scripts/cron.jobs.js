import cron from 'node-cron';
import axios from 'axios';

// Get API base URL from environment variables
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

// Get auth token from environment variables
const AUTH_TOKEN = process.env.CRON_JOB_TOKEN;

// Function to run monthly jobs
const runMonthlyJobs = async () => {
  try {
    console.log('Running monthly jobs...');
    
    const response = await axios.get(`${API_BASE_URL}/cron/monthly`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('Monthly jobs completed:', response.data);
    
  } catch (error) {
    console.error('Error running monthly jobs:', error.message);
    console.error('Error details:', error.response?.data);
  }
};

// Function to run year-end jobs
const runYearEndJobs = async () => {
  try {
    console.log('Running year-end jobs...');
    
    const response = await axios.get(`${API_BASE_URL}/cron/year-end`, {
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`
      }
    });
    
    console.log('Year-end jobs completed:', response.data);
    
  } catch (error) {
    console.error('Error running year-end jobs:', error.message);
    console.error('Error details:', error.response?.data);
  }
};

// Create cron jobs
// Run monthly jobs on the first day of every month at midnight
const monthlyJob = cron.schedule(
  '0 0 1 * *', // At midnight on the first day of every month
  runMonthlyJobs
);

// Run year-end jobs on December 31st at midnight
const yearEndJob = cron.schedule(
  '0 0 31 12 *', // At midnight on December 31st every year
  runYearEndJobs
);

console.log('Cron jobs scheduled');

export { monthlyJob, yearEndJob };