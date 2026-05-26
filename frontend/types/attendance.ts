/**
 * Attendance Types for Atithi WorkFlow Pro
 */

export interface AttendanceFilters {
  date?: string;
  department?: string;
  designation?: string;
  status?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  inTime?: string;
  outTime?: string;
  hoursWorked?: number;
  overtime?: number;
}