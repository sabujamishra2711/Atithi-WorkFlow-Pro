/**
 * Visitor Management Utilities for Atithi WorkFlow Pro
 * Handles visitor data saving and management
 */

import api from '@/lib/apiClient';

// Enhanced Visitor Data Saving
export const saveVisitorData = async (visitorData: any) => {
  try {
    console.log('Saving visitor data:', visitorData);
    
    // Validate required fields
    const requiredFields = ['name', 'phone', 'purpose'];
    const missingFields = requiredFields.filter(field => !visitorData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Prepare data for saving
    const dataToSave = {
      ...visitorData,
      timeIn: visitorData.timeIn || new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    // Try multiple API endpoints
    const endpoints = [
      '/api/v1/visitors',
      '/api/visitors',
      '/api/visitor/register'
    ];

    let response = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log('Trying to save visitor with endpoint:', endpoint);
        response = await api.post(endpoint, dataToSave);
        
        if (response.status >= 200 && response.status < 300) {
          console.log('Visitor saved successfully with endpoint:', endpoint);
          break;
        }
      } catch (error) {
        console.warn('Save endpoint failed:', endpoint, error);
        lastError = error;
        continue;
      }
    }

    if (!response || response.status >= 400) {
      throw lastError || new Error('All visitor save endpoints failed');
    }

    const result = response.data;
    console.log('Visitor save result:', result);
    
    return { 
      success: true, 
      message: 'Visitor registered successfully',
      data: result
    };
  } catch (error) {
    console.error('Visitor save error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save visitor data',
      details: error
    };
  }
};