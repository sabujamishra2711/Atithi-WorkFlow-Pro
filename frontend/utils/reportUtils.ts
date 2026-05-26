/**
 * Report Generation Utilities for Atithi WorkFlow Pro
 * Handles various report generation and export functionalities
 */

import api from '@/lib/apiClient';

// Enhanced Report Generation
export const generateReport = async (reportType: string, filters: Record<string, any> = {}) => {
  try {
    console.log('Generating report:', reportType, filters);

    // Prepare query parameters
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key] !== 'All') {
        params.append(key, filters[key]);
      }
    });

    // Define report endpoints
    const reportEndpoints: Record<string, string> = {
      'attendance-sheet-excel': `/hr/export/attendance-sheet?${params.toString()}`,
      'salary-sheet-excel': `/hr/export/salary-sheet?${params.toString()}`,
      'bank-sheet-excel': `/hr/export/bank-sheet?${params.toString()}`,
      'payroll-summary': `/hr/export/salary-summary?${params.toString()}`,
      'attendance-pdf': `/hr/export/daily-attendance-pdf?${params.toString()}`,
      'monthly-attendance': `/hr/export/monthly-attendance?${params.toString()}`
    };

    const endpoint = reportEndpoints[reportType];
    if (!endpoint) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    console.log('Using endpoint:', endpoint);

    // Set proper responseType for binary data
    const config = {
      responseType: 'blob'
    } as any;

    const response = await api.get(endpoint, config);

    if (response.status >= 400) {
      throw new Error(`Report generation failed: ${response.statusText}`);
    }

    // Handle the blob response
    let blob: Blob;

    if (response.data instanceof Blob) {
      // Axios already returned a Blob when responseType: 'blob' is set
      blob = response.data;
    } else {
      // Convert response data to blob
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      blob = new Blob([response.data], { type: contentType });
    }

    if (blob.size === 0) {
      throw new Error('Report file is empty');
    }

    // Extract filename from Content-Disposition header if available
    let filename = `${reportType}-${new Date().toISOString().split('T')[0]}.xlsx`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Report generated successfully' };
  } catch (error) {
    console.error('Report generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report',
      details: error
    };
  }
};

// Dedicated function for exporting attendance sheet
export const exportAttendanceSheet = async (month: string) => {
  try {
    console.log('Exporting attendance sheet for month:', month);

    if (!month) {
      throw new Error('Month is required in YYYY-MM format');
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    // Set proper responseType for binary data
    const config = {
      responseType: 'blob'
    } as any;

    const response = await api.get(`/hr/export/attendance-sheet?month=${month}`, config);

    if (response.status >= 400) {
      throw new Error(`Attendance sheet export failed: ${response.statusText}`);
    }

    // Handle the blob response
    let blob: Blob;

    if (response.data instanceof Blob) {
      // Axios already returned a Blob when responseType: 'blob' is set
      blob = response.data;
    } else {
      // Convert response data to blob
      const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      blob = new Blob([response.data], { type: contentType });
    }

    if (blob.size === 0) {
      throw new Error('Attendance sheet file is empty');
    }

    // Extract filename from Content-Disposition header if available
    let filename = `attendance-sheet-${month}.xlsx`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Attendance sheet exported successfully' };
  } catch (error) {
    console.error('Attendance sheet export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export attendance sheet',
      details: error
    };
  }
};

// Dedicated function for exporting bank sheet
export const exportBankSheet = async (month: string) => {
  try {
    console.log('Exporting bank sheet for month:', month);

    if (!month) {
      throw new Error('Month is required in YYYY-MM format');
    }

    // Validate month format
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    // Set proper responseType for binary data
    const config = {
      responseType: 'blob'
    } as any;

    const response = await api.get(`/hr/export/bank-sheet?month=${month}`, config);

    if (response.status >= 400) {
      throw new Error(`Bank sheet export failed: ${response.statusText}`);
    }

    // Handle the blob response
    let blob: Blob;

    if (response.data instanceof Blob) {
      // Axios already returned a Blob when responseType: 'blob' is set
      blob = response.data;
    } else {
      // Convert response data to blob
      const contentType = response.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      blob = new Blob([response.data], { type: contentType });
    }

    if (blob.size === 0) {
      throw new Error('Bank sheet file is empty');
    }

    // Extract filename from Content-Disposition header if available
    let filename = `bank-sheet-${month}.xlsx`;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    // Create download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Bank sheet exported successfully' };
  } catch (error) {
    console.error('Bank sheet export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export bank sheet',
      details: error
    };
  }
};
