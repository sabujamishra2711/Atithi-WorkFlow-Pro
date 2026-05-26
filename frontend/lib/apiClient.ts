// lib/apiClient.ts
import axios from 'axios';

// Determine the base URL based on the environment
  const getBaseURL = () => {
    // Use NEXT_PUBLIC_API_URL if defined, but handle relative paths for SSR
    const apiURL = process.env.NEXT_PUBLIC_API_URL || '';
    
    if (typeof window !== 'undefined') {
      // Client-side: ALWAYS use /api/v1 to hit the local proxy and avoid CORS "Network Error"
      // unless we are specifically debugging and want to hit the backend directly
      return '/api/v1';
    }
    
    // Server-side (SSR): must be an absolute URL
    if (apiURL.startsWith('http')) return apiURL;
    // Default to backend URL for server-side calls
    return 'http://localhost:8000/api/v1';
  };

// Create axios instance with base URL
const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Only access localStorage in the browser
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle redirect in the browser
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('accessToken');
      // Avoid infinite redirect loop
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Salary History API endpoints
export const salaryHistoryApi = {
  // Get salary history for an employee
  getSalaryHistory: (empId: string) =>
    api.get(`/salary-history/${empId}`),

  // Add a new salary history record
  addSalaryHistory: (empId: string, data: any) =>
    api.post(`/salary-history/${empId}`, data),

  // Update a salary history record
  updateSalaryHistory: (id: string, data: any) =>
    api.patch(`/salary-history/${id}`, data),

  // Delete a salary history record
  deleteSalaryHistory: (id: string) =>
    api.delete(`/salary-history/${id}`),
};

export const handleApiResponse = async (response: { data: unknown }) => {
  return response.data;
};

export default api;
