"use client";

import { useAuthUser } from "@/shared/hooks/AuthContext";
import { hasAppPermission } from "@/shared/utils/permissions";
import type { Role } from "@/shared/types/types";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  ListFilter,
  Loader2,
  PlayCircle,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchClearButton } from "@/shared/components/ui/SearchClearButton";

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
type TrackingStatusKey = "not_synced" | "not_started" | "in_progress" | "completed";
type StatusFilter = "all" | TrackingStatusKey;
type SortOption = "last_activity" | "progress_desc" | "progress_asc" | "name";

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

type StaffTrackingRow = {
  managedUser: ManagedUser;
  progress: StaffMember | null;
  completionPercentage: number;
  latestWatchPercentage: number;
  statusKey: TrackingStatusKey;
  status: ReturnType<typeof getTrainingStatus>;
};

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

function getTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getDisplayName(managedUser: ManagedUser) {
  return managedUser.full_name || managedUser.username;
}

function getTrackingStatusKey(progress: StaffMember | null): TrackingStatusKey {
  if (!progress) return "not_synced";
  if (progress.training_status === "completed") return "completed";
  if (progress.training_status === "watching" || progress.training_status === "ready_to_complete") {
    return "in_progress";
  }
  return "not_started";
}

function getTrainingStatus(progress: StaffMember | null) {
  const status = progress?.training_status ?? "not_started";

  if (!progress) {
    return {
      label: "Not Synced",
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
      label: "Ready to Complete",
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (status === "watching") {
    return {
      label: "Started",
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Not Started",
    className: "bg-slate-100 text-slate-600",
  };
}

export default function StaffAdminPage() {
  const router = useRouter();
  const user = useAuthUser();
  const canManageLms = hasAppPermission(user?.role, "lms:manage");
  
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [lmsStaff, setLmsStaff] = useState<StaffMember[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userActionError, setUserActionError] = useState("");
  const [userActionSuccess, setUserActionSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [sortOption, setSortOption] = useState<SortOption>("last_activity");
  const [selectedRow, setSelectedRow] = useState<StaffTrackingRow | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Fetch both Settings users and LMS staff
  const loadData = useCallback(async () => {
    if (!canManageLms) return;

    setIsUsersLoading(true);
    setUserActionError("");
    try {
      const [usersRes, staffRes] = await Promise.all([
        fetch("/api/auth/users", {
          cache: "no-store",
          credentials: "include"
        }),
        fetch("/api/lms/staff")
      ]);
      const [usersData, staffData] = await Promise.all([
        usersRes.json().catch(() => ({})) as Promise<{
        ok?: boolean;
        error?: string;
        users?: ManagedUser[];
        }>,
        staffRes.json().catch(() => ({ success: false, data: [] }))
      ]);

      if (!usersRes.ok || usersData.ok === false || !Array.isArray(usersData.users)) {
        throw new Error(usersData.error || "Failed to load users");
      }

      setUsers(usersData.users);

      if (staffData.success) {
        setLmsStaff(staffData.data);
      }
    } catch (error) {
      setUserActionError(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setIsUsersLoading(false);
    }
  }, [canManageLms]);

  useEffect(() => {
    if (!canManageLms) {
      router.push("/lms", { scroll: false });
      return;
    }
    void loadData();
  }, [canManageLms, router, loadData]);

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

  // Sync all users to LMS
  const syncAllUsersToLMS = async () => {
    if (!canManageLms) return;
    
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

  const usersWithProgress = useMemo(() => {
    return users.map((managedUser) => {
      const progress = getLMSProgress(managedUser);
      const statusKey = getTrackingStatusKey(progress);
      return {
        managedUser,
        progress,
        completionPercentage: clampPercentage(progress?.completion_percentage),
        latestWatchPercentage: clampPercentage(progress?.latest_watch_percentage),
        statusKey,
        status: getTrainingStatus(progress),
      };
    });
  }, [getLMSProgress, users]);

  const staffSummary = useMemo(() => {
    const progressRows = usersWithProgress
      .map((row) => row.progress)
      .filter((progress): progress is StaffMember => Boolean(progress));
    const totalLessons = progressRows.reduce((sum, progress) => sum + (Number(progress.total_lessons) || 0), 0);
    const completedLessons = progressRows.reduce((sum, progress) => sum + (Number(progress.completed_lessons_count) || 0), 0);

    return {
      totalUsers: users.length,
      syncedUsers: progressRows.length,
      notSyncedUsers: usersWithProgress.filter((row) => row.statusKey === "not_synced").length,
      notStartedUsers: usersWithProgress.filter((row) => row.statusKey === "not_started").length,
      inProgressUsers: usersWithProgress.filter((row) => row.statusKey === "in_progress").length,
      completedUsers: progressRows.filter((progress) => progress.training_status === "completed").length,
      needFollowUpUsers: usersWithProgress.filter((row) =>
        row.statusKey === "not_synced" ||
        row.statusKey === "not_started" ||
        (row.statusKey === "in_progress" && row.completionPercentage < 50)
      ).length,
      completedLessons,
      totalLessons,
      overallCompletion: totalLessons > 0 ? clampPercentage((completedLessons / totalLessons) * 100) : 0,
    };
  }, [users.length, usersWithProgress]);

  const learningMonitorRows = useMemo(() => {
    return usersWithProgress
      .filter((row) => row.progress)
      .sort((a, b) => {
        const aTime = a.progress?.last_activity ? new Date(a.progress.last_activity).getTime() : 0;
        const bTime = b.progress?.last_activity ? new Date(b.progress.last_activity).getTime() : 0;
        return bTime - aTime || b.completionPercentage - a.completionPercentage;
      })
      .slice(0, 4);
  }, [usersWithProgress]);

  const attentionRows = useMemo(() => {
    return usersWithProgress
      .filter((row) => row.statusKey === "not_synced" || row.statusKey === "not_started" || row.completionPercentage < 50)
      .sort((a, b) => a.completionPercentage - b.completionPercentage)
      .slice(0, 4);
  }, [usersWithProgress]);

  const roleOptions = useMemo(() => {
    return Array.from(new Set(users.map((managedUser) => managedUser.role))).sort();
  }, [users]);

  const filteredTrackingRows = useMemo(() => {
    const query = normalizeText(searchQuery);

    return usersWithProgress
      .filter((row) => {
        const managedUser = row.managedUser;
        const progress = row.progress;
        const matchesSearch = !query || [
          managedUser.username,
          managedUser.full_name,
          managedUser.email,
          managedUser.phone,
          managedUser.role,
          progress?.last_watched_lesson_title,
        ].some((value) => normalizeText(value).includes(query));

        const matchesStatus = statusFilter === "all" || row.statusKey === statusFilter;
        const matchesRole = roleFilter === "all" || managedUser.role === roleFilter;

        return matchesSearch && matchesStatus && matchesRole;
      })
      .sort((a, b) => {
        const aName = getDisplayName(a.managedUser);
        const bName = getDisplayName(b.managedUser);

        if (sortOption === "name") {
          return aName.localeCompare(bName);
        }

        if (sortOption === "progress_desc") {
          return b.completionPercentage - a.completionPercentage || aName.localeCompare(bName);
        }

        if (sortOption === "progress_asc") {
          return a.completionPercentage - b.completionPercentage || aName.localeCompare(bName);
        }

        return (
          getTime(b.progress?.last_activity) - getTime(a.progress?.last_activity) ||
          b.completionPercentage - a.completionPercentage ||
          aName.localeCompare(bName)
        );
      });
  }, [roleFilter, searchQuery, sortOption, statusFilter, usersWithProgress]);

  if (!canManageLms) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/lms", { scroll: false })}
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
                <h1 className="text-2xl font-bold text-slate-800">Staff Tracking</h1>
                <p className="text-sm text-slate-500">Track staff learning process and LMS completion</p>
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

        <div className="mb-8 grid gap-4 min-[420px]:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Staff</p>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.totalUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Settings accounts</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Synced to LMS</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.syncedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">{`${staffSummary.notSyncedUsers} not synced`}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Not Started</p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.notStartedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Need follow-up</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">In Progress</p>
              <PlayCircle className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.inProgressUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Started learning</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.completedUsers}</p>
            <p className="mt-1 text-xs text-slate-500">Finished all lessons</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Overall</p>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.overallCompletion}%</p>
            <p className="mt-1 text-xs text-slate-500">{`${staffSummary.completedLessons}/${staffSummary.totalLessons} lessons`}</p>
          </div>
        </div>

        {/* Staff Learning Process Monitor */}
        <div className="mb-8 rounded-3xl bg-white p-6 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Staff Learning Process
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Monitor who has started, who is progressing, and who needs follow-up.
              </p>
            </div>
            <div className="rounded-2xl bg-purple-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Overall completion</p>
              <p className="mt-1 text-2xl font-bold text-purple-700">{staffSummary.overallCompletion}%</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>{`${staffSummary.completedLessons} of ${staffSummary.totalLessons} lessons completed`}</span>
              <span>{`${staffSummary.syncedUsers} synced staff`}</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-emerald-500"
                style={{ width: `${staffSummary.overallCompletion}%` }}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">In Progress</p>
                <PlayCircle className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.inProgressUsers}</p>
              <p className="mt-1 text-xs text-slate-500">Started or ready to complete</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Not started</p>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.notStartedUsers}</p>
              <p className="mt-1 text-xs text-slate-500">Need follow-up</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Completed</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-800">{staffSummary.completedUsers}</p>
              <p className="mt-1 text-xs text-slate-500">Finished all assigned lessons</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800">Latest learning activity</h3>
              <div className="mt-3 space-y-3">
                {learningMonitorRows.length > 0 ? learningMonitorRows.map(({ managedUser, progress, completionPercentage }) => (
                  <div key={managedUser.username} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700" data-no-translate>
                        {managedUser.full_name || managedUser.username}
                      </p>
                      <p className="truncate text-xs text-slate-500">{progress?.last_watched_lesson_title || "No lesson activity"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-slate-800">{completionPercentage}%</p>
                      <p className="text-xs text-slate-500">{formatDate(progress?.last_activity)}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No learning activity yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-sm font-bold text-slate-800">Need Follow-up</h3>
              <div className="mt-3 space-y-3">
                {attentionRows.length > 0 ? attentionRows.map(({ managedUser, progress, completionPercentage }) => (
                  <div key={managedUser.username} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700" data-no-translate>
                        {managedUser.full_name || managedUser.username}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {!progress ? "Not synced to LMS" : progress.training_status === "not_started" ? "Not started learning" : "Low completion progress"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {completionPercentage}%
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">Everyone is on track.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filters, and Sync */}
        <div className="mb-6 grid gap-3 rounded-3xl bg-white p-4 shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] lg:grid-cols-[minmax(0,1fr)_170px_150px_190px_auto]">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              title="Search staff"
              placeholder="Search name, email, phone, or lesson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-12 pr-12 text-sm text-slate-700 placeholder-slate-400 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            {searchQuery && (
              <SearchClearButton
                onClear={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 focus:ring-purple-500/30"
              />
            )}
          </div>
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              title="Filter by status"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-12 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="all">All Status</option>
              <option value="not_synced">Not Synced</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <select
            title="Filter by role"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as Role | "all")}
            className="h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium text-slate-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">All Roles</option>
            {roleOptions.map((roleOption) => (
              <option key={roleOption} value={roleOption}>{roleOption}</option>
            ))}
          </select>
          <select
            title="Sort staff"
            aria-label="Sort staff"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value as SortOption)}
            className="h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-medium text-slate-700 focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="last_activity">Last Activity</option>
            <option value="progress_desc">Progress High</option>
            <option value="progress_asc">Progress Low</option>
            <option value="name">Name</option>
          </select>
          <button
            type="button"
            onClick={syncAllUsersToLMS}
            disabled={isSyncingAll || isUsersLoading}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isSyncingAll ? "Syncing..." : `Sync Staff to LMS (${users.length})`}
          </button>
        </div>

        {/* Staff Tracking Table */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Staff Progress Table</h2>
              <p className="text-sm text-slate-500">
                {`Showing ${filteredTrackingRows.length} of ${usersWithProgress.length} staff accounts`}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">{`${staffSummary.needFollowUpUsers} need follow-up`}</p>
          </div>

          {isUsersLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
              <p className="mt-4 text-slate-500">Loading users...</p>
            </div>
          ) : userActionError && userActionError.includes("Access denied") ? (
            <div className="py-12 text-center">
              <Shield className="mx-auto mb-4 h-12 w-12 text-amber-500" />
              <h3 className="mb-2 text-lg font-semibold text-slate-800">Admin Access Required</h3>
              <p className="mb-4 text-slate-500">{userActionError}</p>
              <button
                type="button"
                onClick={() => router.push("/settings", { scroll: false })}
                className="rounded-xl bg-amber-100 px-4 py-2 font-medium text-amber-700 transition-colors hover:bg-amber-200"
              >
                Go to Settings
              </button>
            </div>
          ) : filteredTrackingRows.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-semibold text-slate-800">No Staff Found</h3>
              <p className="text-slate-500">No staff accounts match the current filters</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[960px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Staff</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Lessons</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Lesson</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTrackingRows.map((row) => {
                      const { managedUser, progress, completionPercentage, status } = row;

                      return (
                        <tr key={managedUser.username} className="transition-colors hover:bg-slate-50/80">
                          <td className="px-5 py-4">
                            <div className="flex min-w-0 items-center gap-3">
                              {managedUser.profile_picture ? (
                                <Image
                                  src={managedUser.profile_picture}
                                  alt={managedUser.username}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-sm font-bold text-white">
                                  {getDisplayName(managedUser).charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-bold text-slate-800" data-no-translate>
                                    {getDisplayName(managedUser)}
                                  </p>
                                  {managedUser.username.toLowerCase() === (user?.username || "").toLowerCase() && (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">You</span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-slate-500" data-no-translate>
                                  {managedUser.email || managedUser.username}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              managedUser.role === "Admin"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {managedUser.role}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="min-w-[140px]">
                              <div className="mb-1 flex justify-between text-xs text-slate-500">
                                <span>Completion</span>
                                <span className="font-semibold text-slate-700">{completionPercentage}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completionPercentage}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {progress ? `${progress.completed_lessons_count}/${progress.total_lessons}` : "0/0"}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatDate(progress?.last_activity)}</td>
                          <td className="max-w-[220px] truncate px-4 py-4 text-sm text-slate-500">
                            {progress?.last_watched_lesson_title || "No lesson activity"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedRow(row)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 p-4 lg:hidden">
                {filteredTrackingRows.map((row) => {
                  const { managedUser, progress, completionPercentage, latestWatchPercentage, status } = row;

                  return (
                    <div key={managedUser.username} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        {managedUser.profile_picture ? (
                          <Image
                            src={managedUser.profile_picture}
                            alt={managedUser.username}
                            width={48}
                            height={48}
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-base font-bold text-white">
                            {getDisplayName(managedUser).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-bold text-slate-800" data-no-translate>
                              {getDisplayName(managedUser)}
                            </h3>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500" data-no-translate>
                            {managedUser.email || managedUser.username}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-slate-500">
                          <span>Progress</span>
                          <span className="font-semibold text-slate-700">{completionPercentage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completionPercentage}%` }} />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>{managedUser.role}</span>
                        <span className="text-right">{progress ? `${progress.completed_lessons_count}/${progress.total_lessons} lessons` : "Not synced"}</span>
                        <span>{`Last: ${formatDate(progress?.last_activity)}`}</span>
                        <span className="text-right">{`${latestWatchPercentage}% latest`}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRow(row)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {selectedRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-bold text-slate-800" data-no-translate>
                    {getDisplayName(selectedRow.managedUser)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500" data-no-translate>
                    {selectedRow.managedUser.email || selectedRow.managedUser.username}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close staff tracking details"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-6 py-5">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">Status</p>
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${selectedRow.status.className}`}>
                      {selectedRow.status.label}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-700">Completion</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">{selectedRow.completionPercentage}%</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-700">Completed</p>
                    <p className="mt-2 text-2xl font-bold text-blue-800">
                      {selectedRow.progress ? `${selectedRow.progress.completed_lessons_count}/${selectedRow.progress.total_lessons}` : "0/0"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-700">Latest Watch</p>
                    <p className="mt-2 text-2xl font-bold text-amber-800">{selectedRow.latestWatchPercentage}%</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-100 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">Overall progress</span>
                    <span className="font-bold text-slate-800">{selectedRow.completionPercentage}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${selectedRow.completionPercentage}%` }} />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
                    <div className="mt-3 space-y-2 text-slate-600">
                      <p>Role: {selectedRow.managedUser.role}</p>
                      <p>
                        Email: {selectedRow.managedUser.email ? (
                          <span data-no-translate>{selectedRow.managedUser.email}</span>
                        ) : (
                          "No email"
                        )}
                      </p>
                      <p>
                        Phone: {selectedRow.managedUser.phone ? (
                          <span data-no-translate>{selectedRow.managedUser.phone}</span>
                        ) : (
                          "No phone"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Learning Activity</p>
                    <div className="mt-3 space-y-2 text-slate-600">
                      <p>Last activity: {formatDate(selectedRow.progress?.last_activity)}</p>
                      <p>Last lesson: {selectedRow.progress?.last_watched_lesson_title || "No lesson activity"}</p>
                      <p>Watched videos: {selectedRow.progress?.watched_lessons_count ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
