/**
 * Unified User Service
 *
 * Single source of truth for all users across the application.
 * Settings users, LMS staff, and Admin users are all the same entity.
 *
 * @module services/UnifiedUserService
 */

import { lmsService } from "@/systems/lms/services/LmsService";
import type { CreateLmsStaffInput, UpdateLmsStaffInput, LmsStaffEntity } from "@/systems/lms/types/lms-entities";
import type { Role } from "@/shared/types/types";
import * as userStore from "@/lib/userStore";

// ============================================================================
// Types - Single Unified User Model
// ============================================================================

export type UserRole = Role;

export interface UnifiedUser {
  // Core Identity (same across all modules)
  id: string;                    // Auth system ID (username)
  full_name: string;
  email: string | null;
  role: UserRole;

  // Profile Data
  phone: string | null;
  branch_location: string | null;
  avatar_url: string | null;

  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;

  // LMS Specific (null if not enrolled in LMS)
  lms_staff_id?: number;
  lms_enrolled_at?: string;
  lms_completion_rate?: number;
}

export interface CreateUserInput {
  id: string;                    // Username
  password: string;
  full_name: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  branch_location?: string;
  enroll_in_lms?: boolean;       // Auto-enroll as staff
}

export interface UpdateUserInput {
  id: string;
  full_name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  branch_location?: string;
  is_active?: boolean;
  avatar_url?: string;
  lms_staff_id?: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Unified User Service
// ============================================================================

export class UnifiedUserService {
  private static instance: UnifiedUserService;

  public static getInstance(): UnifiedUserService {
    if (!UnifiedUserService.instance) {
      UnifiedUserService.instance = new UnifiedUserService();
    }
    return UnifiedUserService.instance;
  }

  // ============================================================================
  // CREATE - Single User Creation Flow
  // ============================================================================

  /**
   * Create a unified user that works across all modules
   * Used by: Settings, Admin LMS, LMS
   */
  async createUser(input: CreateUserInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Step 1: Create auth user (settings system)
      const authResult = await this.createAuthUser({
        username: input.id,
        password: input.password,
        role: input.role || "Staff",
      });

      if (!authResult.success) {
        return { success: false, error: authResult.error };
      }

      // Step 2: Create LMS staff if requested or if role requires it
      let lmsData: { staff_id?: number; enrolled_at?: string } = {};

      if (input.enroll_in_lms !== false) {
        // All users get LMS access with unified role system
        const lmsResult = await this.enrollInLMS({
          fullName: input.full_name,
          email: input.email || null,
          role: (input.role || "Staff"),
          branchLocation: input.branch_location || null,
          phone: input.phone || null,
        });

        if (lmsResult.success && lmsResult.data) {
          lmsData = {
            staff_id: Number(lmsResult.data.id),
            enrolled_at: new Date().toISOString(),
          };
        }
      }

      const user: UnifiedUser = {
        id: input.id,
        full_name: input.full_name,
        email: input.email || null,
        role: input.role || "Staff",
        phone: input.phone || null,
        branch_location: input.branch_location || null,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: null,
        ...lmsData,
      };

      return { success: true, data: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // READ - Get Users (Unified View)
  // ============================================================================

  /**
   * Get all users with unified data from all systems
   */
  async getAllUsers(): Promise<ServiceResponse<UnifiedUser[]>> {
    try {
      // Direct library call instead of internal HTTP fetch
      const authUsers = await userStore.listUsers();

      // Get LMS staff data
      const lmsResult = await lmsService.getStaff(); // Assuming this fetches all staff
      const lmsStaffMap = new Map<string, LmsStaffEntity>();
      if (lmsResult.success && lmsResult.data) {
        lmsResult.data.forEach(s => {
          lmsStaffMap.set(s.fullName.toLowerCase(), s);
          if (s.email) lmsStaffMap.set(s.email.toLowerCase(), s);
        });
      }

      // Merge into unified view
      const users: UnifiedUser[] = authUsers.map((authUser) => {
        const staff = lmsStaffMap.get(authUser.username.toLowerCase());

        return this.mergeUserData(authUser, staff);
      });

      return { success: true, data: users };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch users";
      return { success: false, error: message };
    }
  }

  /**
   * Get single user by ID
   */
  async getUserById(id: string): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Get from auth system
      const usersResult = await this.getAllUsers();
      if (!usersResult.success) {
        return { success: false, error: usersResult.error };
      }

      const user = usersResult.data?.find(u => u.id === id);
      if (!user) {
        return { success: false, error: "User not found" };
      }

      return { success: true, data: user };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // UPDATE - Modify User Across All Systems
  // ============================================================================

  /**
   * Update user in all systems
   */
  async updateUser(input: UpdateUserInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Update LMS staff if exists
      if (input.lms_staff_id) {
        const lmsUpdate: UpdateLmsStaffInput = {
          fullName: input.full_name,
          email: input.email,
          branchLocation: input.branch_location,
          role: input.role ? this.mapToLmsRole(input.role) : undefined,
          phone: input.phone,
          isActive: input.is_active,
        };

        const lmsResult = await lmsService.updateStaff(input.lms_staff_id, lmsUpdate);
        if (!lmsResult.success) {
          console.warn("[UnifiedUserService] LMS update failed:", lmsResult.error);
        }
      }

      // Note: Auth system updates would go here if supported

      // Return updated user
      const userResult = await this.getUserById(input.id);
      return userResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // DELETE - Remove User From All Systems
  // ============================================================================

  /**
   * Delete user from auth system (LMS staff handled separately)
   */
  async deleteUser(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const result = await userStore.deleteUser({
        username: id,
        requestedBy: "system" // Or the actual user performing the deletion
      });

      if (!result.ok) throw new Error(result.error);

      // LMS staff record remains for historical data (soft delete is preferred)
      // Can be deactivated via separate call if needed

      return { success: true, data: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // LMS Enrollment
  // ============================================================================

  /**
   * Enroll existing user in LMS
   */
  async enrollUserInLMS(userId: string, lmsData: CreateLmsStaffInput): Promise<ServiceResponse<UnifiedUser>> {
    try {
      // Get current user
      const userResult = await this.getUserById(userId);
      if (!userResult.success || !userResult.data) {
        return { success: false, error: "User not found" };
      }

      // Create LMS staff record
      const lmsResult = await lmsService.createStaff(lmsData);
      if (!lmsResult.success) {
        return { success: false, error: lmsResult.error || "Failed to enroll in LMS" };
      }

      // Return updated user
      const updatedUser: UnifiedUser = {
        ...userResult.data,
        lms_staff_id: lmsResult.data ? Number(lmsResult.data.id) : undefined,
        lms_enrolled_at: new Date().toISOString(),
      };

      return { success: true, data: updatedUser };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enroll user";
      return { success: false, error: message };
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async createAuthUser(data: { username: string; password: string; role: string }): Promise<ServiceResponse<void>> {
    const result = await userStore.createUser({
      username: data.username,
      password: data.password,
      role: data.role as Role,
      createdBy: "system" // Assuming system is the creator for this flow
    });

    if (!result.ok) return { success: false, error: result.error };

    return { success: true };
  }

  private async enrollInLMS(data: CreateLmsStaffInput): Promise<ServiceResponse<LmsStaffEntity>> {
    return await lmsService.createStaff(data);
  }

  private mergeUserData(
    authUser: userStore.PublicUser, // Use the PublicUser type from userStore
    staff: LmsStaffEntity | undefined
  ): UnifiedUser {
    return {
      id: authUser.username,
      full_name: staff?.fullName || authUser.username,
      email: staff?.email || null,
      role: this.mapFromLmsRole(staff?.role || authUser.role),
      phone: staff?.phone || null,
      branch_location: staff?.branchLocation || null,
      avatar_url: null,
      is_active: staff?.isActive ?? true,
      created_at: new Date(authUser.createdAt).toISOString(),
      updated_at: new Date(authUser.updatedAt).toISOString(),
      last_login_at: null,
      lms_staff_id: staff?.id ? Number(staff.id) : undefined,
      lms_enrolled_at: staff?.createdAt,
    };
  }

  private mapToLmsRole(role: UserRole): Role {
    // Unified role system - same roles everywhere
    return role;
  }

  private mapFromLmsRole(role: string): UserRole {
    // Unified role system - only Admin and Staff are valid
    if (role === "Admin") return "Admin";
    return "Staff";
  }
}

// Export singleton
export const unifiedUserService = UnifiedUserService.getInstance();
