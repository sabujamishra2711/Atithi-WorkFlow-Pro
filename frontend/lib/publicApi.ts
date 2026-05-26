/**
 * Public API client for Atithi WorkFlow Pro
 * Used for routes that don't require authentication
 */

import axios from 'axios';

// Determine the base URL based on the environment
const getBaseURL = () => {
  // Always use the full API URL regardless of environment
  // In production, this should be set to the actual domain
  // In development, this defaults to localhost
  return process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ?
      `${window.location.origin}/api/v1` :
      'http://localhost:8000/api/v1');
};

const publicApi = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

export default publicApi;