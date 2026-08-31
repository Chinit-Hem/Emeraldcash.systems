import { ensureAuditLogsTable } from "@/lib/audit-log";
import { dbManager } from "@/lib/db-singleton";
import { hasAppPermission } from "@/lib/auth-helpers";
import { smsService } from "@/systems/sms/services/SmsService";
import { vehicleService } from "@/systems/vms/services/VehicleService";
import type { Role } from "@/shared/types/types";

export type NotificationSource = "sms" | "vms" | "loan" | "lms" | "hr";

export type UnifiedNotification = {
  id: string;
  source: NotificationSource;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  href: string;
};

type SessionUser = { username: string; role: Role };
type AuditRow = {
  id: string | number;
  action: string;
  actor_username: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata: unknown;
  created_at: string | Date;
};

const MAX_LIMIT = 100;
let ensureReadTablePromise: Promise<void> | null = null;

function hasPermission(user: SessionUser, permission: Parameters<typeof hasAppPermission>[1]) {
  return hasAppPermission(user.role, permission);
}

function toIsoDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function metadataValue(metadata: unknown, key: string) {
  const value = typeof metadata === "string"
    ? (() => { try { return JSON.parse(metadata) as Record<string, unknown>; } catch { return {}; } })()
    : metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
  return value[key] == null ? "" : String(value[key]);
}

function metadataObject(metadata: unknown) {
  if (typeof metadata === "string") { try { return JSON.parse(metadata) as Record<string, unknown>; } catch { return {}; } }
  return metadata && typeof metadata === "object" ? metadata as Record<string, unknown> : {};
}

function auditNotification(row: AuditRow, user: SessionUser): UnifiedNotification | null {
  const resourceType = row.resource_type || "";
  const source: NotificationSource = ["loan", "operation_report", "account_report"].includes(resourceType)
    ? "loan"
    : resourceType.startsWith("lms_") ? "lms"
      : resourceType === "user" ? "hr"
        : "hr";
  const action = row.action || "system.activity";
  const actor = row.actor_username || "A team member";
  const loanNumber = metadataValue(row.metadata, "loanNumber");
  const metadata = metadataObject(row.metadata);
  const recipients = Array.isArray(metadata.recipientUsernames) ? metadata.recipientUsernames.map(String) : [];
  const currentUsername = user.username.trim().toLocaleLowerCase();
  if (recipients.length && !recipients.some((recipient) => recipient.trim().toLocaleLowerCase() === currentUsername)) return null;
  // Do not show a notification back to the user who performed the action.
  if (actor.trim().toLocaleLowerCase() === currentUsername) return null;

  if (resourceType === "operation_report") {
    const isSubmitted = action.endsWith(".submit");
    const isReturned = action.endsWith(".returned");
    if (!isSubmitted && !isReturned) return null;
    if (!recipients.length) return null;
    const reportType = metadataValue(metadata, "reportType");
    const branch = metadataValue(metadata, "branch");
    const reportDate = metadataValue(metadata, "reportDate");
    const reportLabel = reportType === "bm" ? "BM" : "LS";
    const comment = metadataValue(metadata, "comment");
    return {
      id: String(row.id), source: "loan", type: action,
      title: isReturned ? `${reportLabel} Report returned` : `${reportLabel} Report submitted`,
      message: isReturned
        ? `${actor} returned your ${reportLabel} Report${branch ? ` for ${branch}` : ""}${reportDate ? ` on ${reportDate}` : ""} for correction.${comment ? ` ${comment}` : ""}`
        : `${actor} submitted ${reportType === "bm" ? "a BM" : "an LS"} Report${branch ? ` for ${branch}` : ""}${reportDate ? ` on ${reportDate}` : ""}.`,
      readAt: null, createdAt: toIsoDate(row.created_at), href: "/loan?view=operationReport&reportPanel=records",
    };
  }

  if (resourceType === "account_report") {
    const isSubmitted = action.endsWith(".submit");
    const isReturned = action.endsWith(".returned");
    if (!isSubmitted && !isReturned) return null;
    if (!recipients.length) return null;
    const branch = metadataValue(metadata, "branch");
    const reportDate = metadataValue(metadata, "reportDate");
    const comment = metadataValue(metadata, "comment");
    return {
      id: String(row.id), source: "loan", type: action,
      title: isReturned ? "Account Report returned" : "Account Report submitted",
      message: isReturned
        ? `${actor} returned your Account Report${branch ? ` for ${branch}` : ""}${reportDate ? ` on ${reportDate}` : ""} for correction.${comment ? ` ${comment}` : ""}`
        : `${actor} submitted an Account Report${branch ? ` for ${branch}` : ""}${reportDate ? ` on ${reportDate}` : ""}.`,
      readAt: null, createdAt: toIsoDate(row.created_at), href: "/loan?view=accounting&accountMode=accountReport&reportPanel=records",
    };
  }

  if (source === "loan") {
    return {
      id: String(row.id), source, type: action,
      title: action.includes("approve") ? "Loan approval updated" : action.includes("payment") ? "Loan payment recorded" : "Loan application updated",
      message: loanNumber ? `${actor} updated loan ${loanNumber}.` : `${actor} updated a loan application.`,
      readAt: null, createdAt: toIsoDate(row.created_at),
      href: row.resource_id ? `/loan?openLoan=${encodeURIComponent(row.resource_id)}` : "/loan",
    };
  }

  if (source === "lms") {
    return {
      id: String(row.id), source, type: action,
      title: "Learning activity completed",
      message: `${actor} completed a learning lesson.`,
      readAt: null, createdAt: toIsoDate(row.created_at),
      href: row.resource_id ? `/lms/lesson/${encodeURIComponent(row.resource_id)}` : "/lms",
    };
  }

  return {
    id: String(row.id), source, type: action,
    title: action.includes("create") ? "Employee account created" : "Employee account updated",
    message: `${actor} changed an employee account.`,
    readAt: null, createdAt: toIsoDate(row.created_at), href: "/settings?tab=users",
  };
}

async function ensureReadTable() {
  if (!ensureReadTablePromise) {
    ensureReadTablePromise = dbManager.executeUnsafe(
      `CREATE TABLE IF NOT EXISTS unified_notification_reads (
        username VARCHAR(128) NOT NULL,
        source VARCHAR(16) NOT NULL,
        source_id VARCHAR(128) NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (username, source, source_id)
      )`,
      [],
      8_000
    ).then(() => undefined).catch((error) => {
      ensureReadTablePromise = null;
      throw error;
    });
  }
  await ensureReadTablePromise;
}

async function auditNotifications(user: SessionUser, limit: number) {
  const allowedTypes: string[] = [];
  if (hasPermission(user, "loans:view")) allowedTypes.push("loan", "operation_report", "account_report");
  if (hasPermission(user, "lms:view")) allowedTypes.push("lms_lesson");
  if (hasPermission(user, "users:view")) allowedTypes.push("user");
  if (!allowedTypes.length) return [] as UnifiedNotification[];

  await ensureAuditLogsTable();
  const placeholders = allowedTypes.map((_, index) => `$${index + 1}`).join(", ");
  const rows = await dbManager.executeUnsafe<AuditRow>(
    `SELECT id, action, actor_username, resource_type, resource_id, metadata, created_at
     FROM audit_logs
     WHERE resource_type IN (${placeholders})
       AND status = 'success'
       AND created_at >= NOW() - INTERVAL '30 days'
     ORDER BY created_at DESC
     LIMIT $${allowedTypes.length + 1}`,
    [...allowedTypes, limit],
    8_000
  );
  return rows.flatMap((row) => {
    const notification = auditNotification(row, user);
    return notification ? [notification] : [];
  });
}

async function getReadKeys(username: string, notifications: UnifiedNotification[]) {
  const auditable = notifications.filter((notification) => notification.source !== "sms" && notification.source !== "vms");
  if (!auditable.length) return new Set<string>();
  await ensureReadTable();
  const values = auditable.flatMap((notification) => [notification.source, notification.id]);
  const terms = auditable.map((_, index) => `(source = $${index * 2 + 2} AND source_id = $${index * 2 + 3})`).join(" OR ");
  const rows = await dbManager.executeUnsafe<{ source: string; source_id: string }>(
    `SELECT source, source_id FROM unified_notification_reads WHERE username = $1 AND (${terms})`,
    [username, ...values],
    8_000
  );
  return new Set(rows.map((row) => `${row.source}:${row.source_id}`));
}

type UnifiedNotificationResult = { notifications: UnifiedNotification[]; unreadCount: number };
const NOTIFICATION_CACHE_TTL_MS = 10_000;
const notificationCache = new Map<string, { data: UnifiedNotificationResult; expiresAt: number }>();
const notificationRequests = new Map<string, Promise<UnifiedNotificationResult>>();

async function loadUnifiedNotifications(user: SessionUser, requestedLimit = 20): Promise<UnifiedNotificationResult> {
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
  const [smsResult, vmsResult, auditsResult] = await Promise.allSettled([
    hasPermission(user, "sms:view") ? smsService.getNotifications(user.username, { limit }) : Promise.resolve(null),
    hasPermission(user, "vehicles:view") ? vehicleService.getStockNotifications(user.username, limit) : Promise.resolve(null),
    auditNotifications(user, limit),
  ]);

  const notifications: UnifiedNotification[] = [];
  if (smsResult.status === "fulfilled" && smsResult.value?.success) {
    notifications.push(...(smsResult.value.data?.notifications ?? []).map((notification) => ({
      id: String(notification.id), source: "sms" as const, type: notification.type,
      title: notification.title, message: notification.message, readAt: notification.readAt,
      createdAt: notification.createdAt, href: notification.assetId ? `/sms/assets/${notification.assetId}` : "/sms/assets",
    })));
  }
  if (vmsResult.status === "fulfilled" && vmsResult.value?.success) {
    notifications.push(...(vmsResult.value.data ?? []).map((notification) => ({
      id: String(notification.id), source: "vms" as const, type: notification.type,
      title: notification.title, message: notification.message,
      readAt: notification.isRead ? notification.createdAt : null,
      createdAt: notification.createdAt, href: "/stock",
    })));
  }
  if (auditsResult.status === "fulfilled") notifications.push(...auditsResult.value);

  const readKeys = await getReadKeys(user.username, notifications);
  const merged = notifications
    .map((notification) => readKeys.has(`${notification.source}:${notification.id}`)
      ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
      : notification)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  return { notifications: merged, unreadCount: merged.filter((notification) => !notification.readAt).length };
}

export function getUnifiedNotifications(user: SessionUser, requestedLimit = 20): Promise<UnifiedNotificationResult> {
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
  const cacheKey = user.username + ":" + limit;
  const cached = notificationCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data);

  const pending = notificationRequests.get(cacheKey);
  if (pending) return pending;

  const request = loadUnifiedNotifications(user, limit)
    .then((data) => {
      notificationCache.set(cacheKey, { data, expiresAt: Date.now() + NOTIFICATION_CACHE_TTL_MS });
      return data;
    })
    .finally(() => {
      notificationRequests.delete(cacheKey);
    });
  notificationRequests.set(cacheKey, request);
  return request;
}

function invalidateNotificationCache(username: string) {
  for (const key of notificationCache.keys()) {
    if (key.startsWith(username + ":")) notificationCache.delete(key);
  }
}

export async function markUnifiedNotificationsRead(
  user: SessionUser,
  requested?: Array<Pick<UnifiedNotification, "source" | "id">>
) {
  const notifications = requested?.length
    ? requested
    : (await getUnifiedNotifications(user, MAX_LIMIT)).notifications
      .filter((notification) => !notification.readAt)
      .map(({ source, id }) => ({ source, id }));
  if (!notifications.length) return;

  const smsIds = notifications.filter((notification) => notification.source === "sms").map((notification) => Number(notification.id)).filter(Number.isInteger);
  const vmsIds = notifications.filter((notification) => notification.source === "vms").map((notification) => Number(notification.id)).filter(Number.isInteger);
  const auditItems = notifications.filter((notification) => notification.source === "loan" || notification.source === "lms" || notification.source === "hr");

  await Promise.all([
    ...smsIds.map((id) => smsService.markNotificationsRead(user.username, id)),
    ...vmsIds.map((id) => vehicleService.markStockNotificationsRead(user.username, id)),
  ]);
  if (auditItems.length) {
    await ensureReadTable();
    await Promise.all(auditItems.map((notification) => dbManager.executeUnsafe(
      `INSERT INTO unified_notification_reads (username, source, source_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (username, source, source_id) DO NOTHING`,
      [user.username, notification.source, notification.id],
      8_000
    )));
  }
  invalidateNotificationCache(user.username);
}
