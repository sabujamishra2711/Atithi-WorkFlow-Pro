/**
 * Authentication Utilities for Atithi WorkFlow Pro
 * Handles user authentication and profile management
 */

import api from '@/lib/apiClient';

// Enhanced User Profile Loading for Sidebar
export const getUserProfile = async () => {
  try {
    // Check cache first
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      try {
        const userData = JSON.parse(cachedUser);
        return { success: true, data: userData };
      } catch (e) {
        console.warn('Invalid cached user data, fetching fresh');
      }
    }

    // Try multiple API endpoints using the proper axios instance
    const endpoints = [
      '/users/me',
      '/api/v1/users/me',
      '/api/users/me'
    ];

    let response = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log('Trying user profile endpoint:', endpoint);
        response = await api.get(endpoint);

        if (response.status >= 200 && response.status < 300) {
          console.log('User profile loaded successfully with endpoint:', endpoint);
          break;
        }
      } catch (error) {
        console.warn('Profile endpoint failed:', endpoint, error);
        lastError = error;
        continue;
      }
    }

    if (!response || response.status >= 400) {
      throw lastError || new Error('All user profile endpoints failed');
    }

    const result = response.data;
    const userData = result.data || result.user || result;

    // Cache the user data
    localStorage.setItem('user', JSON.stringify(userData));

    console.log('User profile loaded:', userData);
    return { success: true, data: userData };
  } catch (error) {
    console.error('User profile loading error:', error);

    // Return fallback user data
    const fallbackUser = {
      fullName: 'User',
      email: 'user@company.com',
      role: 'Employee',
      empId: 'EMP001',
      profileImageUrl: null
    };

    return {
      success: false,
      data: fallbackUser,
      error: error instanceof Error ? error.message : 'Failed to load user profile'
    };
  }
};

// Fix 7: Authentication Check
export const checkAuthentication = () => {
  const token = localStorage.getItem('accessToken');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    console.warn('No authentication found, redirecting to login');
    // Note: In a real implementation, we would redirect to login
    // window.location.href = '/login';
    return false;
  }

  try {
    // Basic token validation (check if it's not expired)
    const tokenData = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;

    if (tokenData.exp && tokenData.exp < currentTime) {
      console.warn('Token expired, redirecting to login');
      localStorage.clear();
      // window.location.href = '/login';
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Invalid token format, redirecting to login');
    localStorage.clear();
    // window.location.href = '/login';
    return false;
  }
};

// Fix 8: Enhanced Employee Deletion
export const deleteEmployee = async (empId: string) => {
  try {
    console.log('Deleting employee:', empId);

    if (!empId) {
      throw new Error('Employee ID is required');
    }

    // Use the properly configured axios instance to delete the employee
    // Using the correct API endpoint with /api/v1 prefix
    const response = await api.delete(`/employees/${empId}`);
    console.log('Delete employee response:', response);

    if (response.status >= 200 && response.status < 300) {
      console.log('Employee deleted successfully');
      return {
        success: true,
        message: 'Employee deleted successfully',
        data: response.data
      };
    } else {
      throw new Error(`Delete request failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Employee delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete employee',
      details: error
    };
  }
};