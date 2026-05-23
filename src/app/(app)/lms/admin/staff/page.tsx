"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import type { Role } from "@/lib/types";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  Mail,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Trash2,
  Users
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type ManagedUser = {
  username: string;
  role: Role;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
};

type TrainingStatus = "not_started" | "watching" | "ready_to_complete" | "completed";

interface StaffMember {
  id: number;
  staff_id: number;
  full_name: string;
  staff_name: string;
  email: string | null;
  branch_location: string | null;
  branch: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  completed_lessons_count: number;
  total_lessons: number;
  completion_percentage: number;
  watched_lessons_count: number;
  in_progress_lessons_count: number;
  average_watch_percentage: number;
  latest_watch_percentage: number;
  last_completed_at: string | null;
  last_watched_at: string | null;
  last_watched_lesson_title: string | null;
  training_status: TrainingStatus;
  last_activity: string | null;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function clampPercentage(value?: number | null) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 0;
  return Math.min(100, Math.max(0, Math.round(numberValue)));
}

function formatDate(value?: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleDateString();
}

function getTrainingStatus(progress: StaffMember | null) {
  const status = progress?.training_status ?? "not_started";

  if (!progress) {
    return {
      label: "Not synced",
      className: "bg-slate-100 text-slate-600",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "ready_to_complete") {
    return {
      label: "Ready to complete",
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (status === "watching") {
    return {
      label: "Watching",
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Not started",
    className: "bg-slate-100 text-slate-600",
  };
}

export default function StaffAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [lmsStaff, setLmsStaff] = useState<StaffMember[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("Staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfilePicture, setEditProfilePicture] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch both Settings users and LMS staff
  const loadData = useCallback(async () => {
    if (!isAdmin) return;

    setIsUsersLoading(true);
    setUserActionError("");
    try {
      // Fetch Settings users
      const usersRes = await fetch("/api/auth/users", { 
        cache: "no-store",
        credentials: "include"
      });
      const usersData = (await usersRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        users?: ManagedUser[];
      };

      if (!usersRes.ok || usersData.ok === false || !Array.isArray(usersData.users)) {
        throw new Error(usersData.error || "Failed to load users");
      }

      setUsers(usersData.users);

      // Fetch LMS staff
      const staffRes = await fetch("/api/lms/staff");
      const staffData = await staffRes.json();
      if (staffData.success) {
        setLmsStaff(staffData.data);
      }
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setIsUsersLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms");
      return;
    }
    void loadData();
  }, [isAdmin, router, loadData]);

  // Sync user with LMS staff
  const syncUserWithLMS = async (username: string, fullName: string | null, email: string | null, phone: string | null, role: Role) => {
    try {
      const staffRes = await fetch("/api/lms/staff", { cache: "no-store" });
      const staffData = await staffRes.json().catch(() => ({ success: false, data: [] }));
      
      if (staffData.success && Array.isArray(staffData.data)) {
        const existingStaff = staffData.data.find((s: { email?: string | null; full_name?: string }) => 
          (email && s.email === email) || s.full_name === (fullName || username)
        );
        
        if (existingStaff) {
          await fetch(`/api/lms/staff?id=${existingStaff.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: fullName || username,
              email: email,
              phone: phone,
              role: role,
            }),
          });
        } else {
          await fetch("/api/lms/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: fullName || username,
              email: email,
              phone: phone,
              role: role,
            }),
          });
        }
      }
    } catch (error) {
      console.error("Failed to sync with LMS:", error);
    }
  };

  // Delete LMS staff by email
  const deleteLMSStaff = async (email: string | null) => {
    if (!email) return;
    
    try {
      const staffRes = await fetch("/api/lms/staff", { cache: "no-store" });
      const staffData = await staffRes.json().catch(() => ({ success: false, data: [] }));
      
      if (staffData.success && Array.isArray(staffData.data)) {
        const staff = staffData.data.find((s: { email?: string | null }) => s.email === email);
        if (staff) {
          await fetch(`/api/lms/staff?id=${staff.id}`, { method: "DELETE" });
        }
      }
    } catch (error) {
      console.error("Failed to delete LMS staff:", error);
    }
  };

  // Sync all users to LMS
  const syncAllUsersToLMS = async () => {
    if (!isAdmin) return;
    
    setIsSyncingAll(true);
    setUserActionError("");
    setUserActionSuccess("");
    
    try {
      for (const user of users) {
        await syncUserWithLMS(
          user.username,
          user.full_name || null,
          user.email || null,
          user.phone || null,
          user.role
        );
      }
      
      setUserActionSuccess(`Synced ${users.length} users to LMS`);
      await loadData();
    } catch {
      setUserActionError("Failed to sync some users to LMS");
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUserActionError("");
    setUserActionSuccess("");

    const username = newUsername.trim().toLowerCase();
    if (!username) {
      setUserActionError("Username is required");
      return;
    }

    if (!newPassword) {
      setUserActionError("Password is required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setUserActionError("Password confirmation does not match");
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to create user");
      }

      // Sync with LMS staff
      await syncUserWithLMS(username, null, null, null, newRole);

      setUserActionSuccess(`User "${username}" created successfully`);
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("Staff");
      await loadData();
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (targetUsername: string) => {
    const normalized = targetUsername.trim().toLowerCase();
    if (!normalized) return;

    setUserActionError("");
    setUserActionSuccess("");

    const confirmed = window.confirm(`Delete user "${normalized}"?`);
    if (!confirmed) return;

    setDeletingUsername(normalized);
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to delete user");
      }

      // Also delete from LMS if email exists
      const userToDelete = users.find(u => u.username === normalized);
      if (userToDelete?.email) {
        await deleteLMSStaff(userToDelete.email);
      }

      setUserActionSuccess(`User "${normalized}" deleted successfully`);
      await loadData();
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeletingUsername(null);
    }
  };

  // Start editing a user
  const startEditUser = (managedUser: ManagedUser) => {
    setEditingUser(managedUser);
    setEditFullName(managedUser.full_name || "");
    setEditEmail(managedUser.email || "");
    setEditPhone(managedUser.phone || "");
    setEditProfilePicture(managedUser.profile_picture || null);
    setUserActionError("");
    setUserActionSuccess("");
  };

  // Cancel editing
  const cancelEditUser = () => {
    setEditingUser(null);
    setEditFullName("");
    setEditEmail("");
    setEditPhone("");
    setEditProfilePicture(null);
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingUser) return;

    setIsUploadingAvatar(true);
    setUserActionError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/auth/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok && data.url) {
        setEditProfilePicture(data.url);
        setUserActionSuccess("Photo uploaded successfully");
      } else {
        const errorMsg = data.details || data.error || `Failed to upload photo (HTTP ${res.status})`;
        setUserActionError(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to upload photo";
      setUserActionError(errorMsg);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Update user profile
  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;

    setUserActionError("");
    setUserActionSuccess("");
    setIsUpdatingUser(true);

    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editingUser.username,
          full_name: editFullName.trim() || null,
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
          profile_picture: editProfilePicture,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Failed to update user");
      }

      // Sync with LMS staff
      await syncUserWithLMS(
        editingUser.username,
        editFullName.trim() || null,
        editEmail.trim() || null,
        editPhone.trim() || null,
        editingUser.role
      );

      setUserActionSuccess(`User "${editingUser.username}" updated successfully`);
      setEditingUser(null);
      setEditFullName("");
      setEditEmail("");
      setEditPhone("");
      await loadData();
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to update user");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Get LMS progress for a user - MEMOIZED for performance
  const getLMSProgress = useCallback((managedUser: ManagedUser) => {
    const email = normalizeText(managedUser.email);
    const fullName = normalizeText(managedUser.full_name);
    const username = normalizeText(managedUser.username);

    return lmsStaff.find((staff) => {
      const staffEmail = normalizeText(staff.email);
      const staffName = normalizeText(staff.full_name || staff.staff_name);
      return (
        (email && staffEmail === email) ||
        (fullName && staffName === fullName) ||
        (username && staffName === username)
      );
    }) ?? null;
  }, [lmsStaff]);

  const staffSummary = useMemo(() => {
    const progressRows = users
      .map((managedUser) => getLMSProgress(managedUser))
      .filter((progress): progress is StaffMember => Boolean(progress));

    return {
      totalUsers: users.length,
      syncedUsers: progressRows.length,
      startedUsers: progressRows.filter((progress) =>
        progress.watched_lessons_count > 0 || progress.completed_lessons_count > 0
      ).length,
      completedUsers: progressRows.filter((progress) => progress.training_status === "completed").length,
    };
  }, [getLMSProgress, users]);

  // Filter users based on search - MEMOIZED to avoid recomputation on every render
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter((managedUser) => (
      managedUser.username.toLowerCase().includes(query) ||
      (managedUser.full_name && managedUser.full_name.toLowerCase().includes(query)) ||
      (managedUser.email && managedUser.email.toLowerCase().includes(query)) ||
      (managedUser.phone && managedUser.phone.toLowerCase().includes(query))
    ));
  }, [users, searchQuery]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/lms")}
              aria-label="Back to LMS"
              title="Back to LMS"
              className="p-2.5 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-600 hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Manage Staff</h1>
                <p className="text-sm text-slate-500">Create users and sync to LMS</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData()}
            disabled={isUsersLoading}
            aria-label="Refresh staff data"
            className="p-2.5 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-600 hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] transition-all active:scale-95 disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isUsersLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Messages */}
        {userActionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
            {userActionError}
          </div>
        )}
        {userActionSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm">
            {userActionSuccess}
          </div>
        )}

        <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Users</p>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.totalUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Settings accounts</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">LMS Synced</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.syncedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Ready for training</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Watching</p>
              <PlayCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.startedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Opened at least one video</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.completedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Finished all lessons</p>
          </div>
        </div>

        {/* Create User Form */}
        <div className="mb-8 p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-purple-600" />
            Create New User
          </h2>
          
          <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                type="text"
                title="Username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. employee01"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                title="User role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                title="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                title="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isCreatingUser}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isCreatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isCreatingUser ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        </div>

        {/* Search and Sync */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              title="Search users"
              placeholder="Search users by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <button
            type="button"
            onClick={syncAllUsersToLMS}
            disabled={isSyncingAll || isUsersLoading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isSyncingAll ? "Syncing..." : `Sync All to LMS (${users.length})`}
          </button>
        </div>

        {/* Users List */}
        <div className="grid gap-4">
          {isUsersLoading ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
              <p className="mt-4 text-slate-500">Loading users...</p>
            </div>
          ) : userActionError && userActionError.includes("Access denied") ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <Shield className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Admin Access Required</h3>
              <p className="text-slate-500 mb-4">{userActionError}</p>
              <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 max-w-md mx-auto">
                <p className="text-sm text-amber-700">
                  <strong>Default Admin Credentials:</strong><br />
                  <code className="bg-amber-100 px-2 py-1 rounded">admin / 1234</code>
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 font-medium hover:bg-amber-200 transition-colors"
              >
                Go to Settings
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Users Found</h3>
              <p className="text-slate-500">Create your first user to get started</p>
            </div>
          ) : (
            filteredUsers.map((managedUser) => {
              const lmsProgress = getLMSProgress(managedUser);
              const isSynced = !!lmsProgress;
              const completionPercentage = clampPercentage(lmsProgress?.completion_percentage);
              const latestWatchPercentage = clampPercentage(lmsProgress?.latest_watch_percentage);
              const status = getTrainingStatus(lmsProgress);

              return (
                <div
                  key={managedUser.username}
                  className="flex flex-col gap-4 p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] hover:shadow-[12px_12px_32px_#e2e8f0,-12px_-12px_32px_#ffffff] transition-all lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {managedUser.profile_picture ? (

                        <Image
                          src={managedUser.profile_picture}
                          alt={managedUser.username}
                          width={56}
                          height={56}
                          className="h-14 w-14 rounded-2xl object-cover border-2 border-slate-200"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {(managedUser.full_name || managedUser.username).charAt(0).toUpperCase()}
                        </div>
                      )}
                      {isSynced && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-slate-800">
                        {managedUser.full_name || managedUser.username}
                      </h3>
                      {managedUser.username.toLowerCase() === (user?.username || "").toLowerCase() && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                          You
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        managedUser.role === "Admin" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {managedUser.role === "Admin" && <Shield className="w-3 h-3 inline mr-1" />}
                        {managedUser.role}
                      </span>
                      {isSynced && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                          Synced to LMS
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                        {managedUser.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {managedUser.email}
                          </span>
                        )}
                        {managedUser.phone && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {managedUser.phone}
                          </span>
                        )}
                        <span className="text-slate-400">
                          Created by {managedUser.createdBy}
                        </span>
                      </div>

                      {/* LMS Progress */}
                      {lmsProgress && (
                        <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
                                <span>LMS completion</span>
                                <span>{completionPercentage}%</span>
                              </div>
                              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                                  style={{ width: `${completionPercentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                {lmsProgress.completed_lessons_count}/{lmsProgress.total_lessons} complete
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                                <PlayCircle className="h-3.5 w-3.5 text-blue-500" />
                                {lmsProgress.watched_lessons_count} watched
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
                                <Clock className="h-3.5 w-3.5 text-amber-500" />
                                {latestWatchPercentage}% latest
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Last active: {formatDate(lmsProgress.last_activity)}</span>
                            {lmsProgress.last_watched_lesson_title && (
                              <span className="truncate">Last video: {lmsProgress.last_watched_lesson_title}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => startEditUser(managedUser)}
                      disabled={editingUser !== null}
                      aria-label={`Edit ${managedUser.full_name || managedUser.username}`}
                      className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                      title="Edit user"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(managedUser.username)}
                      disabled={deletingUsername === managedUser.username || managedUser.username.toLowerCase() === (user?.username || "").toLowerCase() || editingUser !== null}
                      aria-label={`Delete ${managedUser.full_name || managedUser.username}`}
                      className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                      title={managedUser.username.toLowerCase() === (user?.username || "").toLowerCase() ? "You cannot delete your own account" : "Delete user"}
                    >
                      {deletingUsername === managedUser.username ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-bold text-slate-800">Edit Profile</p>
                  <p className="text-sm text-slate-500">{editingUser.username}</p>
                </div>
                <button
                  type="button"
                  onClick={cancelEditUser}
                  aria-label="Close edit profile"
                  title="Close edit profile"
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {editProfilePicture ? (
                     
                    <Image
                      src={editProfilePicture}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-2xl object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl border-4 border-white shadow-lg">
                      {(editFullName || editingUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  title="Profile photo"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="sr-only"
                />
              </div>

              {userActionError && (
                <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {userActionError}
                </div>
              )}
              {userActionSuccess && (
                <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {userActionSuccess}
                </div>
              )}
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</label>
                  <input
                    type="text"
                    title="Full name"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    title="Email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. user@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone</label>
                  <input
                    type="tel"
                    title="Phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. +1 234 567 890"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingUser}
                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50"
                  >
                    {isUpdatingUser ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditUser}
                    disabled={isUpdatingUser}
                    className="flex-1 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
              
              <p className="mt-4 text-xs text-center text-slate-500">
                Changes will sync with LMS staff automatically
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
