/**
 * User Types for Atithi WorkFlow Pro
 */

export interface UserProfile {
  fullName: string;
  email: string;
  role: string;
  empId: string;
  profileImageUrl?: string | null;
  [key: string]: any; // Allow additional properties
}

export interface AuthToken {
  token: string;
  exp: number;
  [key: string]: any; // Allow additional properties
}