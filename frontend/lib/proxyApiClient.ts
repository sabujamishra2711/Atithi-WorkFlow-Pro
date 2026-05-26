/**
 * API client for Next.js proxy routes in Atithi WorkFlow Pro
 * This client is used for calling proxy routes that forward requests to the backend
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Create axios instance with optimized settings
const proxyApiClient: AxiosInstance = axios.create({
  timeout: 30000, // Reduced timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Store refresh promise to prevent multiple concurrent refresh requests
let refreshingPromise: Promise<any> | null = null;

// Function to refresh access token
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(
      `/api/users/refresh-token`,
      { refreshToken },
      { 
        withCredentials: true,
        timeout: 10000 // 10 second timeout for token refresh
      }
    );
    
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem('accessToken', accessToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    
    return accessToken;
  } catch (error) {
    // Clear tokens and redirect to login if refresh fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Optionally redirect to login page
    // window.location.href = '/login';
    throw error;
  }
};

// Request interceptor for authentication and logging
proxyApiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Special handling for multipart form data
      // Remove Content-Type header for multipart requests to let browser set it with boundary
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
proxyApiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please check your connection and try again.';
    } else if (error.response?.status === 404) {
      error.message = 'Service not available. Please contact support.';
    } else if (error.response?.status === 401 && !originalRequest._retry) {
      // Handle token expiration and refresh
      if (error.response.data?.message?.includes('expired') || error.response.data?.message?.includes('missing')) {
        originalRequest._retry = true;
        
        try {
          // If we're already refreshing, wait for it to complete
          if (refreshingPromise) {
            await refreshingPromise;
          } else {
            // Start refresh process
            refreshingPromise = refreshAccessToken();
            await refreshingPromise;
            refreshingPromise = null;
          }
          
          // Retry the original request with new token
          const newToken = localStorage.getItem('accessToken');
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          
          return proxyApiClient(originalRequest);
        } catch (refreshError) {
          // Clear tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          return Promise.reject(refreshError);
        }
      }
    } else if (error.response?.status === 403) {
      error.message = 'You do not have permission to perform this action.';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    } else if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }
    
    return Promise.reject(error);
  }
);

export default proxyApiClient;