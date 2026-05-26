/**
 * Error Handling Utilities for Atithi WorkFlow Pro
 * Centralized error handling and reporting
 */

// Fix 6: Enhanced Error Handling
export const handleProductionError = (error: Error, context = '') => {
  console.error(`Production Error [${context}]:`, error);
  
  // User-friendly error messages
  const errorMessages: Record<string, string> = {
    'NetworkError': 'Network connection failed. Please check your internet connection.',
    'TypeError': 'Application error occurred. Please refresh the page.',
    'NotAllowedError': 'Permission denied. Please allow the required permissions.',
    'NotFoundError': 'Resource not found. Please contact support.',
    'AbortError': 'Operation was cancelled. Please try again.'
  };
  
  const userMessage = errorMessages[error.name] || error.message || 'An unexpected error occurred';
  
  return {
    success: false,
    error: userMessage,
    technical: error.message,
    context: context
  };
};