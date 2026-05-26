/**
 * Visitor Types for Atithi WorkFlow Pro
 */

export interface VisitorData {
  name: string;
  phone: string;
  purpose: string;
  timeIn?: string;
  date?: string;
  status?: string;
  [key: string]: any; // Allow additional properties
}