/**
 * Custom hook for report generation in Atithi WorkFlow Pro
 */

import { useState } from 'react';
import { generateReport, exportAttendanceSheet } from '@/utils/reportUtils';

export const useReports = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const generateReportHandler = async (reportType: string, filters = {}) => {
    try {
      setIsGenerating(true);
      setReportError(null);
      const result = await generateReport(reportType, filters);
      
      if (!result.success) {
        setReportError(result.error || 'Failed to generate report');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate report';
      setReportError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAttendanceSheetHandler = async (month: string) => {
    try {
      setIsGenerating(true);
      setReportError(null);
      const result = await exportAttendanceSheet(month);
      
      if (!result.success) {
        setReportError(result.error || 'Failed to export attendance sheet');
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export attendance sheet';
      setReportError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    isGenerating,
    reportError,
    generateReport: generateReportHandler,
    exportAttendanceSheet: exportAttendanceSheetHandler
  };
};