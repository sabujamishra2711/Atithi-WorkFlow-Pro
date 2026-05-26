/**
 * Enhanced API client for production
 * DEPRECATED: Use '@/lib/axios' instead
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

// Create axios instance with production-ready configuration
const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication and logging
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle different types of errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
      error.message = 'Request timed out. Please check your connection and try again.';
    } else if (error.response?.status === 404) {
      console.error('API endpoint not found:', error.config?.url);
      error.message = 'Service not available. Please contact support.';
    } else if (error.response?.status >= 500) {
      console.error('Server error:', error.response?.data);
      error.message = 'Server error. Please try again later.';
    } else if (!error.response) {
      console.error('Network error:', error.message);
      error.message = 'Network error. Please check your internet connection.';
    }

    return Promise.reject(error);
  }
);

// Enhanced file download function
export const downloadFile = async (url, filename, options = {}) => {
  try {
    const response = await apiClient({
      url,
      method: 'GET',
      responseType: 'blob',
      timeout: options.timeout || 120000, // 2 minutes for file downloads
      onDownloadProgress: options.onProgress,
      ...options
    });

    // Check if response is valid
    if (response.data.size === 0) {
      throw new Error('Empty file received from server');
    }

    // Create download link
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream'
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;

    // Ensure link works in all browsers
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);

    return { success: true };
  } catch (error) {
    console.error('File download error:', error);
    return {
      success: false,
      error: error.message || 'Failed to download file'
    };
  }
};

export default apiClient;