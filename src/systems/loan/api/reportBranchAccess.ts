import type { SessionPayload } from "@/lib/auth";
import { queryWithRetry, sql } from "@/lib/db-singleton";

const BRANCH_MANAGER_LABELS = new Set([
  "manager / approver",
  "branch manager",
  "bm",
  "credit manager",
]);

type UserBranchRow = { role: string; position: string | null; branch: string | null };

export type ReportBranchAccess = {
  isBranchManager: boolean;
  branch: string | null;
};

export function isBranchManagerRole(role: string) {
  return BRANCH_MANAGER_LABELS.has(role.trim().toLocaleLowerCase());
}

export function branchesMatch(left: string, right: string) {
  return normalizeReportBranch(left) === normalizeReportBranch(right);
}

export function normalizeReportBranch(branch: string) {
  const normalized = branch
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\u200B-\u200D\uFEFF_-]+/gu, "");

  if (normalized.includes("sensok") || normalized.includes("សែនសុខ")) return "sen-sok";
  if (normalized.includes("boeungkengkang") || normalized.includes("bkk") || normalized.includes("បឹងកេងកង")) return "bkk";
  return normalized;
}

/**
 * Report access for a BM is based on the current users.branch assignment in the
 * database, rather than a client supplied branch or a potentially stale cookie.
 */
export async function getReportBranchAccess(session: SessionPayload): Promise<ReportBranchAccess> {
  const rows = await queryWithRetry(async () => sql<UserBranchRow>`
    SELECT role, position, branch
    FROM users
    WHERE LOWER(BTRIM(username)) = LOWER(BTRIM(${session.username}))
    LIMIT 1
  `, "getBranchManagerReportBranch");

  const user = rows[0];
  const isBranchManager = isBranchManagerRole(user?.role || session.role)
    || isBranchManagerRole(user?.position || "");

  return {
    isBranchManager,
    branch: isBranchManager ? user?.branch?.trim() || null : null,
  };
}
