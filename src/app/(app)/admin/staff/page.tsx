"use client";

import { useAuthUser } from "@/app/components/AuthContext";
import type { Role } from "@/lib/types";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface SettingsUser {
  username: string;
  role: Role;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile_picture?: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

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

interface UnifiedStaffMember {
  id: string | number;
  name: string;
  email: string | null;
  role: string;
  branch: string | null;
  source: "settings" | "lms" | "both";
  settingsUser?: SettingsUser;
  lmsStaff?: StaffMember;
  completion_percentage?: number;
  last_activity?: string | null;
  isSynced: boolean;
}

export default function UnifiedStaffPage() {
  const router = useRouter();
  const user = useAuthUser();
  const isAdmin = user?.role === "Admin";
  
  const [unifiedStaff, setUnifiedStaff] = useState<UnifiedStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "settings" | "lms" | "unsynced">("all");
  const [syncMessage, setSyncMessage] = useState("");

  // Fetch both Settings users and LMS staff
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Settings users
      const usersRes = await fetch("/api/auth/users", { cache: "no-store" });
      const usersData = await usersRes.json();
      const settingsData = usersData.ok ? usersData.users : [];

      // Fetch LMS staff
      const staffRes = await fetch("/api/lms/staff");
      const staffData = await staffRes.json();
      const lmsData = staffData.success ? staffData.data : [];

      // Merge into unified view
      const unified = mergeStaffData(settingsData, lmsData);
      setUnifiedStaff(unified);
    } catch (err) {
      console.error("Failed to load staff data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push("/lms");
      return;
    }
    fetchData();
  }, [isAdmin, router, fetchData]);

  // Merge Settings users and LMS staff
  const mergeStaffData = (settings: SettingsUser[], lms: StaffMember[]): UnifiedStaffMember[] => {
    const unified: UnifiedStaffMember[] = [];
    const processedEmails = new Set<string>();

    // First, match by email
    settings.forEach((settingsUser) => {
      const email = settingsUser.email?.toLowerCase();
      const matchingLms = email 
        ? lms.find((s) => s.email?.toLowerCase() === email)
        : undefined;

      if (matchingLms) {
        processedEmails.add(email!);
        unified.push({
          id: settingsUser.username,
          name: settingsUser.full_name || settingsUser.username,
          email: settingsUser.email || null,
          role: settingsUser.role,
          branch: matchingLms.branch,
          source: "both",
          settingsUser,
          lmsStaff: matchingLms,
          completion_percentage: matchingLms.completion_percentage,
          last_activity: matchingLms.last_activity,
          isSynced: true,
        });
      } else {
        unified.push({
          id: settingsUser.username,
          name: settingsUser.full_name || settingsUser.username,
          email: settingsUser.email || null,
          role: settingsUser.role,
          branch: null,
          source: "settings",
          settingsUser,
          isSynced: false,
        });
      }
    });

    // Add LMS staff that don't have matching Settings users
    lms.forEach((lmsMember) => {
      const email = lmsMember.email?.toLowerCase();
      if (!email || !processedEmails.has(email)) {
        unified.push({
          id: lmsMember.staff_id,
          name: lmsMember.staff_name,
          email: lmsMember.email || null,
          role: lmsMember.role || "Staff",
          branch: lmsMember.branch,
          source: "lms",
          lmsStaff: lmsMember,
          completion_percentage: lmsMember.completion_percentage,
          last_activity: lmsMember.last_activity,
          isSynced: false,
        });
      }
    });

    return unified.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Sync a single user to LMS
  const syncUserToLMS = async (member: UnifiedStaffMember) => {
    if (!member.settingsUser) return;

    setSyncMessage(`Syncing ${member.name}...`);
    try {
      const res = await fetch("/api/lms/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: member.settingsUser.full_name || member.settingsUser.username,
          email: member.settingsUser.email,
          phone: member.settingsUser.phone,
          role: member.settingsUser.role,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSyncMessage(`${member.name} synced successfully!`);
        await fetchData(); // Refresh data
        setTimeout(() => setSyncMessage(""), 3000);
      } else {
        setSyncMessage(`Failed to sync ${member.name}: ${data.error}`);
      }
    } catch {
      setSyncMessage(`Error syncing ${member.name}`);
    }
  };

  // Sync all unsynced users
  const syncAllToLMS = async () => {
    const unsynced = unifiedStaff.filter((s) => s.source === "settings" && !s.isSynced);
    if (unsynced.length === 0) {
      setSyncMessage("All users are already synced!");
      setTimeout(() => setSyncMessage(""), 3000);
      return;
    }

    setSyncing(true);
    setSyncMessage(`Syncing ${unsynced.length} users...`);

    let success = 0;
    let failed = 0;

    for (const member of unsynced) {
      try {
        if (member.settingsUser) {
          const res = await fetch("/api/lms/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              full_name: member.settingsUser.full_name || member.settingsUser.username,
              email: member.settingsUser.email,
              phone: member.settingsUser.phone,
              role: member.settingsUser.role,
            }),
          });

          const data = await res.json();
          if (data.success) success++;
          else failed++;
        }
      } catch {
        failed++;
      }
    }

    await fetchData();
    setSyncing(false);
    setSyncMessage(`Sync complete: ${success} success, ${failed} failed`);
    setTimeout(() => setSyncMessage(""), 5000);
  };

  // Filter staff based on search and tab
  const filteredStaff = unifiedStaff.filter((member) => {
    // Tab filter
    if (activeTab === "settings" && member.source !== "settings") return false;
    if (activeTab === "lms" && member.source !== "lms") return false;
    if (activeTab === "unsynced" && member.isSynced) return false;

    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      (member.email && member.email.toLowerCase().includes(query)) ||
      (member.branch && member.branch.toLowerCase().includes(query)) ||
      member.role.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: unifiedStaff.length,
    settingsOnly: unifiedStaff.filter((s) => s.source === "settings").length,
    lmsOnly: unifiedStaff.filter((s) => s.source === "lms").length,
    synced: unifiedStaff.filter((s) => s.source === "both").length,
    unsynced: unifiedStaff.filter((s) => !s.isSynced).length,
  };

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/lms")}
              className="p-2.5 rounded-xl bg-white shadow-[4px_4px_8px_#e2e8f0,-4px_-4px_8px_#ffffff] text-slate-600 hover:shadow-[6px_6px_12px_#e2e8f0,-6px_-6px_12px_#ffffff] transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Unified Staff Management</h1>
                <p className="text-sm text-slate-500">Manage Settings users and LMS staff in one place</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={syncAllToLMS}
              disabled={syncing || stats.unsynced === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {syncing ? "Syncing..." : `Sync All (${stats.unsynced})`}
            </button>
          </div>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-medium ${
            syncMessage.includes("success") || syncMessage.includes("complete")
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
          }`}>
            {syncMessage}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <p className="text-sm text-slate-500">Total Staff</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <p className="text-sm text-slate-500">Synced</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.synced}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <p className="text-sm text-slate-500">Settings Only</p>
            <p className="text-2xl font-bold text-blue-600">{stats.settingsOnly}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
            <p className="text-sm text-slate-500">LMS Only</p>
            <p className="text-2xl font-bold text-purple-600">{stats.lmsOnly}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] mb-6">
          {[
            { id: "all", label: "All Staff", count: stats.total },
            { id: "settings", label: "Settings Only", count: stats.settingsOnly },
            { id: "lms", label: "LMS Only", count: stats.lmsOnly },
            { id: "unsynced", label: "Needs Sync", count: stats.unsynced },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, branch, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Staff List */}
        <div className="grid gap-4">
          {filteredStaff.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff]">
              <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No Staff Found</h3>
              <p className="text-slate-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            filteredStaff.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-[8px_8px_24px_#e2e8f0,-8px_-8px_24px_#ffffff] hover:shadow-[12px_12px_32px_#e2e8f0,-12px_-12px_32px_#ffffff] transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                    member.source === "both"
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      : member.source === "settings"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600"
                      : "bg-gradient-to-br from-purple-500 to-purple-600"
                  }`}>
                    {member.source === "both" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : member.source === "settings" ? (
                      <User className="w-6 h-6" />
                    ) : (
                      <UserCheck className="w-6 h-6" />
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-800">{member.name}</h3>
                      {/* Source badges */}
                      <div className="flex items-center gap-1">
                        {member.source === "both" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Synced
                          </span>
                        )}
                        {member.source === "settings" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Settings Only
                          </span>
                        )}
                        {member.source === "lms" && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            LMS Only
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </span>
                      )}
                      {member.branch && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {member.branch}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        member.role === "Admin" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {member.role === "Admin" && <Shield className="w-3 h-3 inline mr-1" />}
                        {member.role}
                      </span>
                    </div>

                    {/* LMS Progress (if applicable) */}
                    {member.completion_percentage !== undefined && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                            style={{ width: `${member.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{member.completion_percentage}% complete</span>
                        {member.last_activity && (
                          <span className="text-xs text-slate-400">
                            • Last active: {new Date(member.last_activity).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {member.source === "settings" && !member.isSynced && (
                    <button
                      onClick={() => syncUserToLMS(member)}
                      disabled={syncing}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Sync to LMS
                    </button>
                  )}
                  
                  {member.source === "both" && (
                    <span className="flex items-center gap-1 px-3 py-2 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      In Sync
                    </span>
                  )}

                  {member.source === "lms" && (
                    <span className="flex items-center gap-1 px-3 py-2 text-purple-600 text-sm font-medium">
                      <UserCheck className="w-4 h-4" />
                      LMS Only
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-white rounded-2xl shadow-[4px_4px_12px_#e2e8f0,-4px_-4px_12px_#ffffff]">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-emerald-600" />
              <span className="text-slate-600">Synced (in both Settings and LMS)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-blue-600" />
              <span className="text-slate-600">Settings Only (needs sync to LMS)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-500 to-purple-600" />
              <span className="text-slate-600">LMS Only (not in Settings)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
