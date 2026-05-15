"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import type { Role } from "@/lib/types";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users
} from "lucide-react";
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

interface StaffMember {
  staff_id: number;
  staff_name: string;
  branch: string | null;
  completion_percentage: number;
  last_activity: string | null;
  email?: string;
  role?: string;
  is_active?: boolean;
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
    } catch (_error) {
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
  const getLMSProgress = useCallback((email: string | null) => {
    if (!email) return null;
    return lmsStaff.find(s => s.email?.toLowerCase() === email.toLowerCase());
  }, [lmsStaff]);

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
              onClick={() => router.push("/lms")}
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
            onClick={() => loadData()}
            disabled={isUsersLoading}
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
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. employee01"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
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
              placeholder="Search users by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <button
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
const lmsProgress = getLMSProgress(managedUser.email ?? null);
              const isSynced = !!lmsProgress;
              
              return (
                <div
                  key={managedUser.username}
                  className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] hover:shadow-[12px_12px_32px_#e2e8f0,-12px_-12px_32px_#ffffff] transition-all"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {managedUser.profile_picture ? (
                         
                        <img
                          src={managedUser.profile_picture}
                          alt={managedUser.username}
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
                    
                    <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-800">
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
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                              style={{ width: `${lmsProgress.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{lmsProgress.completion_percentage}% complete</span>
                          {lmsProgress.last_activity && (
                            <span className="text-xs text-slate-400">
                              • Last active: {new Date(lmsProgress.last_activity).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditUser(managedUser)}
                      disabled={editingUser !== null}
                      className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all active:scale-95 disabled:opacity-50"
                      title="Edit user"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(managedUser.username)}
                      disabled={deletingUsername === managedUser.username || managedUser.username.toLowerCase() === (user?.username || "").toLowerCase() || editingUser !== null}
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
                  onClick={cancelEditUser}
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
                     
                    <img
                      src={editProfilePicture}
                      alt="Profile"
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
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
