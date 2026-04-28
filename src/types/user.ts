/**
 * Unified User types
 * Single source of truth for user data across all modules (Settings, LMS, Auth)
 */

import type { Role } from "../lib/types";

export interface UnifiedUser {
  // Core Identity
  id: string;                    // username/auth ID
  username?: string;             // legacy alias
  full_name: string;
  
  // Contact & Profile
  email: string | null;
  phone: string | null;
  branch_location: string | null;
  avatar_url: string | null;
  
  // Roles & Status
  role: Role;
  is_active: boolean;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  
  // LMS Integration (optional)
  lms_staff_id?: number;
  lms_role?: string;
  lms_enrolled_at?: string;
  lms_completion_rate?: number;
}

export interface CreateUnifiedUserDTO {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  role?: Role;
  branch_location?: string;
  phone?: string;
  enroll_in_lms?: boolean;
}

export interface UpdateUnifiedUserDTO {
  username: string;
  full_name?: string;
  email?: string;
  role?: Role;
  branch_location?: string;
  phone?: string;
  is_active?: boolean;
  avatar_url?: string;
  lms_staff_id?: number;
}
