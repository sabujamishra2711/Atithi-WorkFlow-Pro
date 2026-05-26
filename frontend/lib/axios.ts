/**
 * API client for Atithi WorkFlow Pro
 * 
 * DEPRECATED: This file is deprecated. Please use '@/lib/apiClient' instead.
 */

import axios from 'axios';

// Determine the base URL based on the environment
const getBaseURL = () => {
  // Use NEXT_PUBLIC_API_URL if defined, but handle relative paths for SSR
  const apiURL = process.env.NEXT_PUBLIC_API_URL || '';
  
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_API_URL if absolute, otherwise use current origin
    if (apiURL.startsWith('http')) return apiURL;
    return apiURL || `${window.location.origin}/api/v1`;
  }
  
  // Server-side (SSR): must be an absolute URL
  if (apiURL.startsWith('http')) return apiURL;
  return 'http://localhost:8000/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      console.log('Axios Interceptor: accessToken', token);
      if (token) {
        console.log('Attaching accessToken to request:', token);
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('No accessToken found in localStorage. Request might fail.');
      }
    }
    return config;
  }, function (error) {
    // Do something with request error
    return Promise.reject(error);
  });

export default api;