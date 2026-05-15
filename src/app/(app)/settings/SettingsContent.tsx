"use client";

import {
  Car,
  Check,
  ChevronRight,
  Edit3,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
  X,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clearCachedUser } from "@/app/components/authCache";
import { useAuthUser } from "@/app/components/AuthContext";
import ThemeToggle from "@/app/components/ThemeToggle";
import { CambodiaFlag } from "@/components/ui/CambodiaFlag";
import { UKFlag } from "@/components/ui/UKFlag";
import { useTranslation } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageContext";
import type { Role } from "@/lib/types";

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

type TabType = "profile" | "users" | "system";

const UserAvatar = memo(({ 
  user, 
  size = "md",
  showYouBadge = false 
}: { 
  user: { username: string; full_name?: string | null; profile_picture?: string | null };
  size?: "sm" | "md" | "lg";
  showYouBadge?: boolean;
}) => {
  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-24 h-24 text-2xl"
  };

  const initial = (user.full_name || user.username).charAt(0).toUpperCase();

  return (
    <div className="relative shrink-0">
      {user.profile_picture ? (
         
        <img
          src={user.profile_picture}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm`}
          loading="lazy"
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold shadow-sm`}>
          {initial}
        </div>
      )}
      {showYouBadge && (
        <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full">
          YOU
        </div>
      )}
    </div>
  );
});
UserAvatar.displayName = "UserAvatar";

interface QuickLinkCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const QuickLinkCard = memo(({ href, icon: Icon, label, color }: QuickLinkCardProps) => (
  <Link
    href={href}
    className="group relative overflow-hidden rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
    </div>
  </Link>
));
QuickLinkCard.displayName = "QuickLinkCard";

export default function SettingsContent() {
  const router = useRouter();
  const user = useAuthUser();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation(language);
  
  const isAdmin = user.role === "Admin";
  
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("Staff");
  
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfilePicture, setEditProfilePicture] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usersError, setUsersError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickLinks = useMemo(() => {
    const links: { href: string; icon: LucideIcon; label: string; color: string }[] = [
      { href: "/", icon: LayoutDashboard, label: t.dashboard, color: "from-emerald-500 to-teal-600" },
      { href: "/vehicles", icon: Car, label: t.vehicles, color: "from-blue-500 to-indigo-600" },
      { href: "/lms", icon: GraduationCap, label: t.training, color: "from-violet-500 to-purple-600" },
    ];
    if (isAdmin) {
      links.push({ href: "/lms/admin/staff", icon: Users, label: t.lmsStaff, color: "from-amber-500 to-orange-600" });
    }
    return links;
  }, [isAdmin, t]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    setUsersError("");
    try {
      const res = await fetch("/api/auth/users", { 
        cache: "no-store",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.loadError);
      }
      if (!Array.isArray(data.users)) {
        throw new Error(t.loadError);
      }
      setUsers(data.users);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : t.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, t.loadError]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, loadUsers]);

  const handleLogout = useCallback(async () => {
    if (!confirm(t.confirmLogout)) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedUser();
      router.push("/login");
    } catch {
      alert(t.unknownError);
    } finally {
      setIsLoggingOut(false);
    }
  }, [router, t.confirmLogout, t.unknownError]);

  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const username = newUsername.trim().toLowerCase();
    if (!username) {
      setError(t.required);
      return;
    }
    if (!newPassword) {
      setError(t.required);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.saveError);

      setSuccess(t.createSuccess);
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("Staff");
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsCreating(false);
    }
  }, [newUsername, newPassword, confirmPassword, newRole, t, loadUsers]);

  const handleDeleteUser = useCallback(async (username: string) => {
    if (!confirm(`${t.confirmDelete} ${username}?`)) return;
    setDeletingUser(username);
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.deleteError);
      setSuccess(t.deleteSuccess);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.deleteError);
    } finally {
      setDeletingUser(null);
    }
  }, [t, loadUsers]);

  const startEditUser = useCallback((user: ManagedUser) => {
    setEditingUser(user);
    setEditFullName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditProfilePicture(user.profile_picture || null);
    setError("");
    setSuccess("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingUser(null);
    setEditFullName("");
    setEditEmail("");
    setEditPhone("");
    setEditProfilePicture(null);
  }, []);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingUser) return;

    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/auth/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok && data.url) {
        setEditProfilePicture(data.url);
        setSuccess(t.uploadSuccess);
      } else {
        setError(data.error || t.unknownError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unknownError);
    } finally {
      setIsUploading(false);
    }
  }, [editingUser, t]);

  const handleUpdateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    setError("");
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.saveError);

      setSuccess(t.updateSuccess);
      cancelEdit();
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsUpdating(false);
    }
  }, [editingUser, editFullName, editEmail, editPhone, editProfilePicture, t, cancelEdit, loadUsers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {t.settings}
                </h1>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                {t.settingsDescription}
              </p>
            </div>
            {/* Controls removed - will be redesigned in System tab */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "profile"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <User className="w-4 h-4" />
            {t.profile}
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === "users"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="w-4 h-4" />
              {t.userManagement}
              <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                {users.length}
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "system"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Shield className="w-4 h-4" />
            {t.system}
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10" />
              <div className="relative p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <UserAvatar user={user} size="lg" />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                      {user.username}
                    </h2>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                        {user.role === "Admin" ? t.admin : t.staff}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {t.memberSince} {new Date().toLocaleDateString(language === "km" ? "km-KH" : "en-US")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 disabled:opacity-50"
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOut ? t.loading : t.logout}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickLinks.map((link) => (
                <QuickLinkCard key={link.href} {...link} />
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && isAdmin && (
          <div className="space-y-6">
            {/* Create User Card */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
              <div className="p-6 border-b border-slate-200/70 dark:border-slate-700 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-slate-800/50 dark:to-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.createUser}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.createUserDescription}</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder={t.enterUsername}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.role}
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as Role)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    >
                      <option value="Staff">{t.staff}</option>
                      <option value="Admin">{t.admin}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.password}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t.enterPassword}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.confirmPassword}
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t.confirmPassword}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-6">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t.loading}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {t.create}
                      </>
                    )}
                  </button>
                  {success && (
                    <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4" />
                      {success}
                    </span>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* Users List */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
              <div className="p-6 border-b border-slate-200/70 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.teamMembers}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} {t.teamMembersDescription}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/lms/admin/staff"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors text-sm font-medium"
                  >
                    <GraduationCap className="w-4 h-4" />
                    {language === 'km' ? 'គ្រប់គ្រងបុគ្គលិក LMS' : 'Manage LMS Staff'}
                  </Link>
                  <button
                    onClick={() => loadUsers()}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={t.refresh}
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
                  </div>
                ) : usersError ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-red-600 dark:text-red-400 font-medium mb-2">{t.loadError}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{usersError}</p>
                    {usersError.includes("Access denied") && (
                      <div className="mb-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Admin Access Required:</strong><br />
                          Please log out and log back in with:<br />
                          <code className="bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded">admin / 1234</code>
                        </p>
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => loadUsers()}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {language === "km" ? "ព្យាយាមម្តងទៀត" : "Retry"}
                      </button>
                      {usersError.includes("Access denied") && (
                        <button
                          onClick={handleLogout}
                          className="px-4 py-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                        >
                          {language === "km" ? "ចាកចេញ" : "Logout"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">
                      {language === "km" ? "មិនមានអ្នកប្រើប្រាស់" : "No users found"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {language === "km" 
                        ? "បន្ថែមអ្នកប្រើប្រាស់ដំបូងរបស់អ្នកខាងលើ" 
                        : "Add your first user above"}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {users.map((managedUser) => (
                      <div
                        key={managedUser.username}
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-300"
                      >
                        <UserAvatar 
                          user={managedUser} 
                          showYouBadge={managedUser.username === user.username} 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-800 dark:text-white truncate">
                              {managedUser.full_name || managedUser.username}
                            </h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              managedUser.role === "Admin" 
                                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                                : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            }`}>
                              {managedUser.role === "Admin" ? t.admin : t.staff}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {managedUser.email || `@${managedUser.username}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditUser(managedUser)}
                            disabled={editingUser !== null}
                            className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(managedUser.username)}
                            disabled={deletingUser === managedUser.username || managedUser.username === user.username || editingUser !== null}
                            className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50"
                          >
                            {deletingUser === managedUser.username ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === "system" && (
          <div className="space-y-6">
            {/* Appearance Settings */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
              <div className="p-6 border-b border-slate-200/70 dark:border-slate-700 bg-gradient-to-r from-violet-50/50 to-purple-50/50 dark:from-slate-800/50 dark:to-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.appearance}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'ផ្ទៃតាប្លង់ និងភាសា' : 'Theme and language preferences'}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      {language === 'km' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{language === 'km' ? 'របៀបងងឹត' : 'Dark Mode'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'បិទ/បើករបៀបងងឹត' : 'Toggle dark theme'}</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>

                {/* Language Selector */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{t.language}</p>
<p className="text-sm text-slate-500 dark:text-slate-400">
  Current: {language === 'km' ? t.khmer : t.english}
</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-300"
                  >
                    {language === 'en' ? (
                      <>
                        <CambodiaFlag size="sm" />
                        <span>ខ្មែរ</span>
                      </>
                    ) : (
                      <>
                        <UKFlag size="sm" />
                        <span>English</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden">
              <div className="p-6 border-b border-slate-200/70 dark:border-slate-700 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 dark:from-slate-800/50 dark:to-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{language === 'km' ? 'ព័ត៌មានប្រព័ន្ធ' : 'System Information'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'កំណែទំរង់ និងព័ត៌មាន' : 'Version and details'}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'km' ? 'កំណែទំរង់' : 'Version'}</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-white">v2.0.0</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'km' ? 'ប្រព័ន្ធប្រតិបត្តិការ' : 'Platform'}</p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-white">Emerald Cash VMS</p>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center">
                    {language === 'km' 
                      ? '© 2024 Emerald Cash VMS - រក្សាសិទ្ធិគ្រប់យ៉ាង' 
                      : '© 2024 Emerald Cash VMS - All rights reserved'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.edit}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{editingUser.username}</p>
                  </div>
                </div>
                <button
                  onClick={cancelEdit}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Avatar Upload */}
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {editProfilePicture ? (
                     
                    <img
                      src={editProfilePicture}
                      alt="Profile"
                      className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white dark:border-slate-700 shadow-lg">
                      {(editFullName || editingUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                      <RefreshCw className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? t.loading : t.change}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.fullName}
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder={t.enterFullName}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder={t.enterEmail}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.phone}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder={t.enterPhone}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {t.loading}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {t.save}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={isUpdating}
                    className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
