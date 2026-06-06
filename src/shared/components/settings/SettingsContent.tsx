"use client";

import {
  Calculator,
  Boxes,
  Check,
  ChevronRight,
  Edit3,
  Globe,
  GraduationCap,
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
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clearCachedUser } from "@/shared/utils/authCache";
import { useAuthContext, useAuthUser } from "@/shared/hooks/AuthContext";
import ThemeToggle from "@/shared/components/ThemeToggle";
import ChangePasswordModal from "@/shared/components/ChangePasswordModal";
import { CambodiaFlag } from "@/shared/components/ui/CambodiaFlag";
import { UKFlag } from "@/shared/components/ui/UKFlag";
import { useTranslation } from "@/shared/utils/i18n";
import { useLanguage } from "@/shared/hooks/LanguageContext";
import type { Role } from "@/shared/types/types";

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
const USER_ROLE_OPTIONS: Role[] = ["Staff", "Accounting", "Admin"];
const USER_PASSWORD_MIN_LENGTH = 8;

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
  const sizePixels = {
    sm: 40,
    md: 56,
    lg: 96,
  }[size];
  const [imageFailed, setImageFailed] = useState(false);

  const initial = (user.full_name || user.username).charAt(0).toUpperCase();
  const showImage = Boolean(user.profile_picture && !imageFailed);

  useEffect(() => {
    setImageFailed(false);
  }, [user.profile_picture]);

  return (
    <div className="relative shrink-0" data-no-translate>
      {showImage ? (
        <Image
          src={user.profile_picture || ""}
          alt={user.username}
          width={sizePixels}
          height={sizePixels}
          className={`${sizeClasses[size]} rounded-xl border-2 border-white bg-gradient-to-br from-emerald-400 to-blue-500 object-cover shadow-sm dark:border-slate-700`}
          loading="lazy"
          onError={() => setImageFailed(true)}
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
    className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-200 hover:border-emerald-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500/40"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
    </div>
  </Link>
));
QuickLinkCard.displayName = "QuickLinkCard";

export default function SettingsContent() {
  const router = useRouter();
  const user = useAuthUser();
  const { updateProfile, refreshUser } = useAuthContext();
  const { language, toggleLanguage } = useLanguage();
  const { t } = useTranslation(language);
  
  const isAdmin = user.role === "Admin";
  const formatRoleLabel = useCallback((role: Role) => {
    if (role === "Admin") return t.admin;
    if (role === "Accounting") return language === "km" ? "គណនេយ្យ" : "Accounting";
    return t.staff;
  }, [language, t.admin, t.staff]);
  
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [newUsername, setNewUsername] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("Staff");

  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileFullName, setProfileFullName] = useState(user.full_name || "");
  const [profileEmail, setProfileEmail] = useState(user.email || "");
  const [profilePhone, setProfilePhone] = useState(user.phone || "");
  const [profilePicture, setProfilePicture] = useState<string | null>(user.profile_picture || null);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editRole, setEditRole] = useState<Role>("Staff");
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
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  const quickLinks = useMemo(() => {
    const links: { href: string; icon: LucideIcon; label: string; color: string }[] = [
      { href: "/", icon: Calculator, label: "VMS - Vehicle Valuation", color: "from-emerald-500 to-teal-600" },
      { href: "/lms", icon: GraduationCap, label: "LMS - Learning Center", color: "from-violet-500 to-purple-600" },
      { href: "/sms/assets", icon: Boxes, label: "SMS - Asset Inventory", color: "from-blue-500 to-indigo-600" },
    ];
    if (isAdmin) {
      links.push({ href: "/lms/admin/staff", icon: Users, label: language === "km" ? "តាមដានបុគ្គលិក" : "Staff Tracking", color: "from-amber-500 to-orange-600" });
    }
    return links;
  }, [isAdmin, language]);

  useEffect(() => {
    if (isProfileEditing) return;
    setProfileFullName(user.full_name || "");
    setProfileEmail(user.email || "");
    setProfilePhone(user.phone || "");
    setProfilePicture(user.profile_picture || null);
  }, [isProfileEditing, user.email, user.full_name, user.phone, user.profile_picture]);

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
        body: JSON.stringify({
          username,
          password: newPassword,
          role: newRole,
          full_name: newFullName.trim() || null,
          email: newEmail.trim() || null,
          phone: newPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.saveError);

      setSuccess(t.createSuccess);
      setNewUsername("");
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewPassword("");
      setConfirmPassword("");
      setNewRole("Staff");
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsCreating(false);
    }
  }, [newUsername, newFullName, newEmail, newPhone, newPassword, confirmPassword, newRole, t, loadUsers]);

  const handleProfileAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProfileUploading(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/auth/upload-avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (data.ok && data.url) {
        setProfilePicture(data.url);
        setProfileSuccess(t.uploadSuccess);
      } else {
        setProfileError(data.error || t.unknownError);
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t.unknownError);
    } finally {
      setIsProfileUploading(false);
      e.target.value = "";
    }
  }, [t]);

  const handleSaveProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileUpdating(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const result = await updateProfile({
        full_name: profileFullName.trim(),
        email: profileEmail.trim(),
        phone: profilePhone.trim(),
        profile_picture: profilePicture || "",
      });

      if (!result.success) {
        throw new Error(result.error || t.saveError);
      }

      await refreshUser();
      setProfileSuccess(t.updateSuccess);
      setIsProfileEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsProfileUpdating(false);
    }
  }, [profileEmail, profileFullName, profilePhone, profilePicture, refreshUser, t.saveError, t.updateSuccess, updateProfile]);

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
    setEditUsername(user.username);
    setEditPassword("");
    setEditConfirmPassword("");
    setEditRole(USER_ROLE_OPTIONS.includes(user.role) ? user.role : "Staff");
    setEditFullName(user.full_name || "");
    setEditEmail(user.email || "");
    setEditPhone(user.phone || "");
    setEditProfilePicture(user.profile_picture || null);
    setError("");
    setSuccess("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingUser(null);
    setEditUsername("");
    setEditPassword("");
    setEditConfirmPassword("");
    setEditRole("Staff");
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

    const nextUsername = editUsername.trim().toLowerCase();
    if (!nextUsername) {
      setError(t.required);
      return;
    }
    if ((editPassword || editConfirmPassword) && editPassword !== editConfirmPassword) {
      setError(t.passwordMismatch);
      return;
    }
    if (editPassword && editPassword.length < USER_PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`);
      return;
    }

    setIsUpdating(true);
    setError("");
    try {
      const res = await fetch("/api/auth/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editingUser.username,
          newUsername: nextUsername,
          role: editRole,
          ...(editPassword ? { password: editPassword, confirmPassword: editConfirmPassword } : {}),
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
      if (editingUser.username === user.username && (nextUsername !== user.username || editRole !== user.role)) {
        clearCachedUser();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.saveError);
    } finally {
      setIsUpdating(false);
    }
  }, [editingUser, editUsername, editPassword, editConfirmPassword, editRole, editFullName, editEmail, editPhone, editProfilePicture, t, cancelEdit, loadUsers, user.username, user.role, router]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950 sm:pb-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-7 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
              <Settings className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                {t.settings}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                {t.settingsDescription}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8">
        {/* Tab Navigation */}
        <div className={`mb-5 grid gap-1 rounded-2xl border border-slate-200/70 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              activeTab === "profile"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <User className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.profile}</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("users")}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
                activeTab === "users"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="truncate">{t.users}</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab("system")}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              activeTab === "system"
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.system}</span>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4 sm:space-y-6">
            {/* User Profile Card */}
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <UserAvatar user={user} size="md" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl" data-no-translate>
                    {user.full_name || user.username}
                  </h2>
                  <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400" data-no-translate>
                    @{user.username}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
                      {formatRoleLabel(user.role)}
                    </span>
                    {(user.email || user.phone) && (
                      <span className="truncate text-xs text-slate-500 dark:text-slate-400" data-no-translate>
                        {user.email || user.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileEditing(true);
                    setProfileError("");
                    setProfileSuccess("");
                  }}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                >
                  <Edit3 className="h-4 w-4" />
                  {language === "km" ? "កែប្រវត្តិរូប" : "Edit Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Shield className="h-4 w-4" />
                  {language === "km" ? "ពាក្យសម្ងាត់" : "Password"}
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? t.loading : t.logout}
                </button>
              </div>
            </div>

            {/* Profile Details */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{language === "km" ? "ព័ត៌មានគណនី" : "Account Details"}</h3>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400" data-no-translate>{user.email || `@${user.username}`}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="p-4 sm:p-5">
                <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <UserAvatar
                        user={{
                          username: user.username,
                          full_name: profileFullName,
                          profile_picture: profilePicture,
                        }}
                        size="lg"
                      />
                      {isProfileUploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                          <RefreshCw className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    {isProfileEditing && (
                      <>
                        <button
                          type="button"
                          onClick={() => profileFileInputRef.current?.click()}
                          disabled={isProfileUploading}
                          className="mt-3 flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          <Upload className="w-4 h-4" />
                          {isProfileUploading ? t.loading : t.change}
                        </button>
                        <input
                          ref={profileFileInputRef}
                          type="file"
                          title={t.change}
                          accept="image/*"
                          onChange={handleProfileAvatarUpload}
                          className="hidden"
                        />
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t.fullName}</label>
                      <input
                        type="text"
                        title={t.fullName}
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                        disabled={!isProfileEditing || isProfileUpdating}
                        placeholder={t.enterFullName}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t.email}</label>
                      <input
                        type="email"
                        title={t.email}
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        disabled={!isProfileEditing || isProfileUpdating}
                        placeholder={t.enterEmail}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t.phone}</label>
                      <input
                        type="tel"
                        title={t.phone}
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        disabled={!isProfileEditing || isProfileUpdating}
                        placeholder={t.enterPhone}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/50"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{t.role}</label>
                      <input
                        type="text"
                        title={t.role}
                        value={formatRoleLabel(user.role)}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {(profileError || profileSuccess || isProfileEditing) && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
                      {profileSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{profileSuccess}</p>}
                    </div>
                    {isProfileEditing && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileEditing(false);
                            setProfileFullName(user.full_name || "");
                            setProfileEmail(user.email || "");
                            setProfilePhone(user.phone || "");
                            setProfilePicture(user.profile_picture || null);
                            setProfileError("");
                            setProfileSuccess("");
                          }}
                          disabled={isProfileUpdating}
                          className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="submit"
                          disabled={isProfileUpdating || isProfileUploading}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-emerald-500/40 disabled:opacity-50"
                        >
                          {isProfileUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          {isProfileUpdating ? t.loading : t.save}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && isAdmin && (
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.userManagement}</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {users.length}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {language === "km" ? "គ្រប់គ្រងអ្នកប្រើប្រាស់ និងសិទ្ធិចូលប្រើប្រព័ន្ធ។" : "Manage system users and access permissions."}
              </p>
            </div>

            {/* Create User Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200/70 bg-emerald-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.createUser}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.createUserDescription}</p>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleCreateUser} className="p-4 sm:p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.username}
                    </label>
                    <input
                      type="text"
                      title={t.username}
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
                      title={t.role}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as Role)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    >
                      {USER_ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{formatRoleLabel(role)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.fullName}
                    </label>
                    <input
                      type="text"
                      title={t.fullName}
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder={t.enterFullName}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.email}
                    </label>
                    <input
                      type="email"
                      title={t.email}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t.enterEmail}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      title={t.phone}
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder={t.enterPhone}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm hover:shadow-md dark:shadow-slate-900/20 dark:hover:shadow-slate-900/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t.password}
                    </label>
                    <input
                      type="password"
                      title={t.password}
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
                      title={t.confirmPassword}
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
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-4 border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.teamMembers}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{users.length} {t.teamMembersDescription}</p>
                  </div>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Link
                    href="/lms/admin/staff"
                    className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-2.5 text-center text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 sm:flex-none sm:px-4"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span className="sm:hidden">
                      {language === 'km' ? 'បុគ្គលិក LMS' : 'LMS Staff'}
                    </span>
                    <span className="hidden sm:inline">
                      {language === 'km' ? 'គ្រប់គ្រងបុគ្គលិក LMS' : 'Manage LMS Staff'}
                    </span>
                  </Link>
                  <button
                    onClick={() => loadUsers()}
                    disabled={isLoading}
                    className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    title={t.refresh}
                  >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
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
                        type="button"
                        onClick={() => loadUsers()}
                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {language === "km" ? "ព្យាយាមម្តងទៀត" : "Retry"}
                      </button>
                      {usersError.includes("Access denied") && (
                        <button
                          type="button"
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
                  <div className="grid gap-4 pb-2">
                    {users.map((managedUser) => (
                      <div
                        key={managedUser.username}
                        className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/50 bg-slate-50 p-4 transition-all duration-300 hover:bg-white hover:shadow-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-800 sm:gap-4"
                      >
                        <UserAvatar 
                          user={managedUser} 
                          showYouBadge={managedUser.username === user.username} 
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <h4 className="min-w-0 truncate font-semibold text-slate-800 dark:text-white" data-no-translate>
                              {managedUser.full_name || managedUser.username}
                            </h4>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                              managedUser.role === "Admin"
                                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                                : managedUser.role === "Accounting"
                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                            }`}>
                              {formatRoleLabel(managedUser.role)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate" data-no-translate>
                            {managedUser.email || `@${managedUser.username}`}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEditUser(managedUser)}
                            disabled={editingUser !== null}
                            aria-label={`${t.edit} ${managedUser.full_name || managedUser.username}`}
                            title={`${t.edit} ${managedUser.full_name || managedUser.username}`}
                            className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(managedUser.username)}
                            disabled={deletingUser === managedUser.username || managedUser.username === user.username || editingUser !== null}
                            aria-label={`${t.delete} ${managedUser.full_name || managedUser.username}`}
                            title={`${t.delete} ${managedUser.full_name || managedUser.username}`}
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

        {/* Preferences Tab */}
        {activeTab === "system" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Appearance Settings */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t.appearance}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'ផ្ទៃតាប្លង់ និងភាសា' : 'Theme and language preferences'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 sm:p-6">
                {/* Dark Mode Toggle */}
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                      {language === 'km' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-white">{language === 'km' ? 'របៀបងងឹត' : 'Dark Mode'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'ជ្រើសរើសរូបរាងកម្មវិធី' : 'Choose the app theme'}</p>
                    </div>
                  </div>
                  <ThemeToggle className="w-full sm:w-auto" />
                </div>

                {/* Language Selector */}
                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0 p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-white">{t.language}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Current: {language === 'km' ? t.khmer : t.english}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleLanguage}
                    className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-300 sm:w-auto"
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

            {/* System Shortcuts */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                  {language === "km" ? "ផ្លូវកាត់ប្រព័ន្ធ" : "System Shortcuts"}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {language === "km" ? "ចូលទៅប្រព័ន្ធសំខាន់ៗពីកន្លែងតែមួយ។" : "Open key systems from one place."}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map((link) => (
                  <QuickLinkCard key={link.href} {...link} />
                ))}
              </div>
            </div>

            {/* App Info */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{language === 'km' ? 'ព័ត៌មានកម្មវិធី' : 'App Information'}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'km' ? 'កំណែទំរង់ និងព័ត៌មាន' : 'Version and details'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'km' ? 'កំណែទំរង់' : 'Version'}</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-white">v2.0.0</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50 p-4 dark:border-slate-700/50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{language === 'km' ? 'ប្រព័ន្ធប្រតិបត្តិការ' : 'Platform'}</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-white">Emerald Cash Systems</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-emerald-200/50 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-500/10">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 text-center">
                    {language === 'km' 
                      ? `© ${new Date().getFullYear()} អេមើរ៉ល ឃែស - រក្សាសិទ្ធិគ្រប់យ៉ាង`
                      : `© ${new Date().getFullYear()} Emerald Cash - All rights reserved`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      {language === "km" ? "កែអ្នកប្រើប្រាស់" : "Edit User"}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {language === "km" ? "កែសិទ្ធិចូលប្រើ និងព័ត៌មានប្រវត្តិរូប" : "Update access and profile details"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label={t.cancel}
                  title={t.cancel}
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
                     
                    <Image
                      src={editProfilePicture}
                      alt="Profile"
                      width={96}
                      height={96}
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
                  title={t.change}
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
                {editingUser.username === user.username && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {language === "km"
                      ? "អ្នកកំពុងកែគណនីរបស់អ្នក។ ការផ្លាស់ប្តូរ username ឬ role អាចធ្វើឲ្យ session refresh។"
                      : "You are editing your own account. Username or role changes may refresh your session."}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.username}
                  </label>
                  <input
                    type="text"
                    title={t.username}
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder={t.enterUsername}
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {language === "km"
                      ? "ប្រើអក្សរតូច លេខ ចំណុច សញ្ញាដក ឬ underscore, 3-32 តួអក្សរ។"
                      : "Use lowercase letters, numbers, dot, dash, or underscore, 3-32 characters."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.role}
                  </label>
                  <select
                    title={t.role}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as Role)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    {USER_ROLE_OPTIONS.map((role) => (
                      <option key={role} value={role}>{formatRoleLabel(role)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.password}
                  </label>
                  <input
                    type="password"
                    title={t.password}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder={language === "km" ? "ទុកទទេ ប្រសិនបើមិនប្តូរ" : "Leave blank to keep current password"}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {language === "km"
                      ? "ទុកទទេ ប្រសិនបើមិនប្តូរ។ បើប្តូរ ត្រូវមានយ៉ាងតិច 8 តួអក្សរ។"
                      : "Leave blank to keep the current password. Use at least 8 characters when changing it."}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.confirmPassword}
                  </label>
                  <input
                    type="password"
                    title={t.confirmPassword}
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder={language === "km" ? "បញ្ជាក់ពាក្យសម្ងាត់ថ្មី" : "Confirm new password"}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                  {editPassword || editConfirmPassword ? (
                    <p className={`mt-1.5 text-xs ${
                      editPassword === editConfirmPassword
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-red-600 dark:text-red-300"
                    }`}>
                      {editPassword === editConfirmPassword
                        ? (language === "km" ? "ពាក្យសម្ងាត់ត្រូវគ្នា។" : "Passwords match.")
                        : t.passwordMismatch}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                      {language === "km" ? "ចាំបាច់តែពេលកំណត់ពាក្យសម្ងាត់ថ្មី។" : "Required only when setting a new password."}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {t.fullName}
                  </label>
                  <input
                    type="text"
                    title={t.fullName}
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
                      title={t.email}
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
                      title={t.phone}
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
