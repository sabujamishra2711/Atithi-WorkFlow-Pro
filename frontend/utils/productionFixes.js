/**
 * Production Fixes for Atithi WorkFlow Pro
 * Comprehensive fixes for all production issues
 * 
 * DEPRECATED: This file is deprecated. Please use the modular utilities instead:
 * - PDF export: '@/utils/pdfExport'
 * - Camera utilities: '@/utils/cameraUtils'
 * - Visitor utilities: '@/utils/visitorUtils'
 * - Report utilities: '@/utils/reportUtils'
 * - Auth utilities: '@/utils/authUtils'
 * - Error handling: '@/utils/errorHandler'
 */

import api from '@/lib/axios';
import {
  exportAttendancePDF as newExportAttendancePDF,
  exportAttendanceTableToPDF as newExportAttendanceTableToPDF
} from './pdfExport';
import { initializeCamera as newInitializeCamera } from './cameraUtils';
import { saveVisitorData as newSaveVisitorData } from './visitorUtils';
import {
  generateReport as newGenerateReport,
  exportAttendanceSheet as newExportAttendanceSheet
} from './reportUtils';
import {
  getUserProfile as newGetUserProfile,
  checkAuthentication as newCheckAuthentication,
  deleteEmployee as newDeleteEmployee
} from './authUtils';
import { handleProductionError as newHandleProductionError } from './errorHandler';

// Enhanced API client with better error handling
const apiClient = {
  async get(url, options = {}) {
    try {
      // Use the properly configured axios instance
      const response = await api.get(url, options);
      return {
        ok: true,
        status: response.status,
        json: async () => response.data,
        blob: async () => new Blob([JSON.stringify(response.data)], { type: 'application/json' })
      };
    } catch (error) {
      console.error('API GET Error:', error);
      throw error;
    }
  },

  async post(url, data, options = {}) {
    try {
      // Use the properly configured axios instance
      const response = await api.post(url, data, options);
      return {
        ok: true,
        status: response.status,
        json: async () => response.data,
        blob: async () => new Blob([JSON.stringify(response.data)], { type: 'application/json' })
      };
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    }
  }
};

// Export the refactored functions for backward compatibility
export const exportAttendancePDF = newExportAttendancePDF;
export const exportAttendanceTableToPDF = newExportAttendanceTableToPDF;
export const initializeCamera = newInitializeCamera;
export const saveVisitorData = newSaveVisitorData;
export const generateReport = newGenerateReport;
export const exportAttendanceSheet = newExportAttendanceSheet;
export const getUserProfile = newGetUserProfile;
export const handleProductionError = newHandleProductionError;
export const checkAuthentication = newCheckAuthentication;
export const deleteEmployee = newDeleteEmployee;

// Export all functions
export default {
  apiClient,
  exportAttendancePDF,
  exportAttendanceSheet,
  initializeCamera,
  saveVisitorData,
  generateReport,
  getUserProfile,
  handleProductionError,
  checkAuthentication,
  deleteEmployee
};