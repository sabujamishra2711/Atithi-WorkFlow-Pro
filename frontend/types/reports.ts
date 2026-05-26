/**
 * Report Types for Atithi WorkFlow Pro
 */

export type ReportType = 
  | 'attendance-sheet-excel'
  | 'salary-sheet-excel'
  | 'bank-sheet-excel'
  | 'payroll-summary'
  | 'attendance-pdf'
  | 'monthly-attendance';

export interface ReportFilters {
  [key: string]: string | undefined;
}