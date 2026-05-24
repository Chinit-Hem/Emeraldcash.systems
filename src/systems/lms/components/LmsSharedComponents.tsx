/**
 * LMS Shared Components - Pure Neumorphism
 * 
 * Reusable components for LMS interfaces with clean neumorphic design
 * 
 * @module LmsSharedComponents
 */

"use client";

import React from "react";
import {
  GraduationCap,
  BookOpen,
  Users,
  Trophy,
  PlayCircle,
  BarChart3,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Building2,
  Lock,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Download,
  Calendar,
  TrendingUp,
  Award,
} from "lucide-react";
import {
  LMS_COLOR_MAP,
  LmsColorScheme,
  StaffProgress,
  LmsCategory,
} from "@/systems/lms/types/lms-types";
import { safeToLocaleDateString } from "@/shared/utils/safeDate";

// ============================================================================
// Icon Component
// ============================================================================

interface IconComponentProps {
  name: string | null;
  className?: string;
}

export const IconComponent: React.FC<IconComponentProps> = ({ name, className }) => {
  const icons: Record<string, React.ReactNode> = {
    GraduationCap: <GraduationCap className={className} />,
    BookOpen: <BookOpen className={className} />,
    Users: <Users className={className} />,
    Trophy: <Trophy className={className} />,
    PlayCircle: <PlayCircle className={className} />,
    BarChart3: <BarChart3 className={className} />,
    Clock: <Clock className={className} />,
    CheckCircle2: <CheckCircle2 className={className} />,
    Circle: <Circle className={className} />,
    ChevronRight: <ChevronRight className={className} />,
    Building2: <Building2 className={className} />,
    Lock: <Lock className={className} />,
    Plus: <Plus className={className} />,
    Edit2: <Edit2 className={className} />,
    Trash2: <Trash2 className={className} />,
    RefreshCw: <RefreshCw className={className} />,
    ExternalLink: <ExternalLink className={className} />,
    Download: <Download className={className} />,
    Calendar: <Calendar className={className} />,
    TrendingUp: <TrendingUp className={className} />,
    Award: <Award className={className} />,
  };

  return <>{icons[name || ""] || <BookOpen className={className} />}</>;
};

// ============================================================================
// Progress Bar - Neumorphic
// ============================================================================

interface ProgressBarProps {
  percentage: number;
  color?: LmsColorScheme;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color = "emerald",
  size = "md",
  showLabel = false,
  animated = true,
}) => {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const colorClasses = LMS_COLOR_MAP[color];
  
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden shadow-sm ${sizeClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${colorClasses.gradient} ${
            animated ? "animate-pulse-subtle" : ""
          }`}
          style={{ width: `${clampedPercentage}%` }}
        />
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${colorClasses.text} w-12 text-right`}>
          {clampedPercentage}%
        </span>
      )}
    </div>
  );
};

// ============================================================================
// LMS Stat Card - Pure Neumorphism
// ============================================================================

interface LmsStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: LmsColorScheme;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const LmsStatCard: React.FC<LmsStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = "emerald",
  trend,
  onClick,
  className = "",
}) => {
  const colorClasses = LMS_COLOR_MAP[color];

  return (
    <div
      className={`p-5 sm:p-6 bg-slate-100 rounded-[24px] shadow-sm transition-all duration-300 hover:bg-slate-50 active:bg-slate-100 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#4a4a5a] truncate">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#1a1a2e] mt-1">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#4a4a5a] mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${
              trend.isPositive ? "text-emerald-600" : "text-red-600"
            }`}>
              <TrendingUp className={`w-3 h-3 ${!trend.isPositive && "rotate-180"}`} />
              <span>{trend.value}% {trend.isPositive ? "increase" : "decrease"}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-[16px] bg-slate-100 shadow-sm ${colorClasses.text} flex-shrink-0 ml-4`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Category Card - Pure Neumorphism
// ============================================================================

interface CategoryCardProps {
  category: LmsCategory;
  completionRate: number;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  completionRate,
  onClick,
  onEdit,
  onDelete,
  isAdmin = false,
}) => {
  const colorKey = (category.color as LmsColorScheme) || "emerald";
  const colorClasses = LMS_COLOR_MAP[colorKey];
  const isComplete = completionRate === 100;

  return (
    <div
      className={`p-6 bg-slate-100 rounded-[24px] shadow-sm cursor-pointer transition-all duration-300 hover:bg-slate-50 active:bg-slate-100 group ${
        isComplete ? "ring-2 ring-emerald-500/50" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-[16px] bg-slate-100 shadow-sm`}>
          <IconComponent
            name={category.icon}
            className={`w-6 h-6 ${colorClasses.text}`}
          />
        </div>
        <div className="flex items-center gap-2">
          {isComplete ? (
            <div className="p-2 rounded-full bg-slate-100 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          ) : (
            <div className="p-2 rounded-full bg-slate-100 shadow-sm">
              <Circle className="w-5 h-5 text-[#4a4a5a]" />
            </div>
          )}
          {isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-2 rounded-[10px] bg-slate-100 shadow-sm active:bg-slate-100 transition-all"
                >
                  <Edit2 className="w-4 h-4 text-[#4a4a5a]" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-2 rounded-[10px] bg-slate-100 shadow-sm active:bg-slate-100 transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-[#1a1a2e] mb-1">
        {category.name}
      </h3>
      <p className="text-sm text-[#4a4a5a] mb-4 line-clamp-2">
        {category.description || "No description available"}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#4a4a5a]">
            {category.lesson_count} lessons
          </span>
          <span className={`font-medium ${completionRate >= 50 ? colorClasses.text : "text-[#4a4a5a]"}`}>
            {completionRate}%
          </span>
        </div>
        <ProgressBar percentage={completionRate} color={colorKey} size="sm" />
      </div>

      <div className="mt-4 flex items-center text-sm text-[#4a4a5a] group-hover:text-emerald-600 transition-colors">
        <span>{isComplete ? "Review" : "Start Learning"}</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </div>
  );
};

// ============================================================================
// Staff Progress Table - Pure Neumorphism
// ============================================================================

interface StaffProgressTableProps {
  staffProgress: StaffProgress[];
  currentUserName: string;
  currentUserBranch?: string;
  currentUserId?: number;
  currentUserRole?: string;
  isManagerOrAdmin: boolean;
  onViewCertificate?: (staffId: number) => void;
}

export const StaffProgressTable: React.FC<StaffProgressTableProps> = ({
  staffProgress,
  currentUserName,
  currentUserBranch = "Main Branch",
  currentUserId = 0,
  currentUserRole = "Admin",
  isManagerOrAdmin,
  onViewCertificate,
}) => {
  const currentUserInList = staffProgress.find(s => s.staff_name === currentUserName);
  
  const enhancedStaffProgress = currentUserInList 
    ? staffProgress 
    : [
        {
          staff_id: currentUserId,
          staff_name: currentUserName,
          branch: currentUserBranch,
          role: currentUserRole,
          completed_lessons_count: 0,
          total_lessons: 0,
          completion_percentage: 0,
          watched_lessons_count: 0,
          in_progress_lessons_count: 0,
          average_watch_percentage: 0,
          latest_watch_percentage: 0,
          last_completed_at: null,
          last_watched_at: null,
          last_watched_lesson_title: null,
          training_status: "not_started" as const,
          last_activity: null,
        },
        ...staffProgress
      ];

  const visibleStaff = isManagerOrAdmin
    ? enhancedStaffProgress
    : enhancedStaffProgress.filter((s) => s.staff_name === currentUserName);

  if (visibleStaff.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-100 rounded-[24px] shadow-sm">
        <div className="w-16 h-16 mx-auto mb-4 rounded-[16px] bg-slate-100 shadow-sm flex items-center justify-center">
          <Users className="w-8 h-8 text-[#4a4a5a]" />
        </div>
        <p className="text-[#1a1a2e] font-medium">No progress data available</p>
        <p className="text-sm text-[#4a4a5a] mt-1">Staff progress will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 rounded-[24px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-slate-100 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[14px] bg-slate-100 shadow-sm text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a2e]">
                {isManagerOrAdmin ? "Staff Progress Overview" : "My Progress"}
              </h3>
              <p className="text-xs text-[#4a4a5a] mt-0.5">
                {visibleStaff.length} {visibleStaff.length === 1 ? 'staff member' : 'staff members'} tracked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-3 py-1.5 bg-slate-100 text-emerald-600 rounded-full shadow-sm">
              {Math.round(visibleStaff.reduce((acc, s) => acc + s.completion_percentage, 0) / visibleStaff.length)}% Avg
            </span>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Staff Member
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                Last Activity
              </th>
              {onViewCertificate && (
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-[#4a4a5a] uppercase tracking-wider">
                  Certificate
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleStaff.map((staff, index) => (
              <tr
                key={staff.staff_id}
                className="transition-all duration-300 hover:bg-slate-100/50"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[12px] bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      {staff.staff_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a2e]">
                        {staff.staff_name}
                      </p>
                      <p className="text-xs text-[#4a4a5a]">ID: {staff.staff_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm text-[#1a1a2e]">
                    <div className="p-1 rounded-lg bg-slate-100 shadow-sm">
                      <Building2 className="w-3.5 h-3.5 text-[#4a4a5a]" />
                    </div>
                    <span className="font-medium">{staff.branch || "Main Branch"}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#2ecc71] shadow-sm">
                    {staff.role || "Staff"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 w-24">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-sm">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            staff.completion_percentage === 100
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                              : staff.completion_percentage >= 50
                              ? 'bg-gradient-to-r from-blue-500 to-blue-400'
                              : 'bg-gradient-to-r from-amber-500 to-amber-400'
                          }`}
                          style={{ width: `${staff.completion_percentage}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        staff.completion_percentage === 100
                          ? "text-emerald-600"
                          : staff.completion_percentage >= 50
                          ? "text-blue-600"
                          : "text-amber-600"
                      }`}
                    >
                      {staff.completion_percentage}%
                    </span>
                    {staff.completion_percentage === 100 && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-sm text-[#4a4a5a]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{safeToLocaleDateString(staff.last_activity, "Never")}</span>
                  </div>
                </td>
                {onViewCertificate && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {staff.completion_percentage === 100 ? (
                      <button
                        onClick={() => onViewCertificate(staff.staff_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2ecc71] text-white text-xs font-medium rounded-[10px] shadow-sm active:bg-slate-100 transition-all"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        View
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#4a4a5a] bg-slate-100 rounded-[10px] shadow-sm">
                        <Lock className="w-3.5 h-3.5" />
                        Locked
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// Last Updated - Neumorphic
// ============================================================================

interface LastUpdatedProps {
  timestamp: Date | string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({
  timestamp,
  isLoading = false,
  onRefresh,
}) => {
  const [displayTime, setDisplayTime] = React.useState<string>("");

  React.useEffect(() => {
    const updateDisplay = () => {
      if (!timestamp) {
        setDisplayTime("Never");
        return;
      }

      const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) {
        setDisplayTime("Just now");
      } else if (diffMins < 60) {
        setDisplayTime(`${diffMins}m ago`);
      } else if (diffHours < 24) {
        setDisplayTime(`${diffHours}h ago`);
      } else if (diffDays < 7) {
        setDisplayTime(`${diffDays}d ago`);
      } else {
        setDisplayTime(date.toLocaleDateString());
      }
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <div className="flex items-center gap-2 text-sm text-[#4a4a5a]">
      <Clock className="w-4 h-4" />
      <span>Last updated: {displayTime}</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={`p-2 rounded-[10px] bg-slate-100 shadow-sm active:bg-slate-100 transition-all ${
            isLoading ? "animate-spin" : ""
          }`}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Export Button - Neumorphic
// ============================================================================

interface ExportButtonProps {
  onExport: () => void;
  isExporting?: boolean;
  label?: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  isExporting = false,
  label = "Export",
  className = "",
}) => {
  return (
    <button
      onClick={onExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-[#1a1a2e] text-sm font-medium rounded-[12px] shadow-sm active:bg-slate-100 transition-all disabled:opacity-50 ${className}`}
    >
      {isExporting ? (
        <RefreshCw className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {isExporting ? "Exporting..." : label}
    </button>
  );
};

// ============================================================================
// Page Header - Neumorphic
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: LmsColorScheme;
  actions?: React.ReactNode;
  lastUpdated?: Date | string | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  color = "emerald",
  actions,
  lastUpdated,
  onRefresh,
  isLoading = false,
}) => {
  const colorClasses = LMS_COLOR_MAP[color];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <div className={`p-3 rounded-[16px] bg-slate-100 shadow-sm ${colorClasses.text}`}>
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1a2e]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[#4a4a5a] mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {lastUpdated && (
          <LastUpdated
            timestamp={lastUpdated}
            isLoading={isLoading}
            onRefresh={onRefresh}
          />
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

// ============================================================================
// Tab Navigation - Neumorphic
// ============================================================================

interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  return (
    <div className={`flex flex-wrap gap-2 p-2 bg-slate-100 rounded-[16px] shadow-sm ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-[12px] transition-all whitespace-nowrap ${
              isActive
                ? "bg-slate-100 text-emerald-600 shadow-sm"
                : "text-[#4a4a5a] hover:text-[#1a1a2e]"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                isActive
                  ? "bg-emerald-100 text-emerald-700 shadow-sm"
                  : "bg-slate-100 text-[#4a4a5a] shadow-sm"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ============================================================================
// Empty State - Neumorphic
// ============================================================================

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="p-8 text-center bg-slate-100 rounded-[24px] shadow-sm">
      {icon && (
        <div className="mx-auto w-16 h-16 mb-4 rounded-[16px] bg-slate-100 shadow-sm flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-[#1a1a2e] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#4a4a5a] mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2.5 bg-[#2ecc71] text-white font-medium rounded-[12px] shadow-sm active:bg-slate-100 transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Loading Skeleton - Neumorphic
// ============================================================================

interface SkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonGrid: React.FC<SkeletonProps> = ({
  rows = 2,
  columns = 4,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-6 ${className}`}>
      {Array.from({ length: rows * columns }).map((_, i) => (
        <div
          key={i}
          className="h-32 bg-slate-100 rounded-[20px] shadow-sm animate-pulse"
        />
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 p-6 bg-slate-100 rounded-[24px] shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 bg-slate-100 rounded-[12px] shadow-sm animate-pulse"
        />
      ))}
    </div>
  );
};
