/**
 * Custom hook for attendance functionality in Atithi WorkFlow Pro
 */

import { useState } from 'react';
import { exportAttendancePDF } from '@/utils/pdfExport';

export const useAttendance = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportAttendancePDFHandler = async (filters = {}) => {
    try {
      setIsExporting(true);
      setExportError(null);
      const result = await exportAttendancePDF(filters);
      
      if (!result.success) {
        setExportError(result.error || 'Failed to export attendance PDF');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export attendance PDF';
      setExportError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportError,
    exportAttendancePDF: exportAttendancePDFHandler
  };
};