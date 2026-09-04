import type { SessionPayload } from "@/lib/auth";
import { queryWithRetry, sql } from "@/lib/db-singleton";
import { normalizeCompanyBranch } from "@/shared/utils/branchNames";

const BRANCH_MANAGER_LABELS = new Set([
  "manager / approver",
  "credit / approver",
  "branch manager",
  "bm",
  "credit manager",
]);

type UserBranchRow = { role: string; position: string | null; branch: string | null };

export type ReportBranchAccess = {
  isBranchManager: boolean;
  isHumanResources: boolean;
  isDirector: boolean;
  branch: string | null;
  branches: string[];
};

export function isBranchManagerRole(role: string) {
  return BRANCH_MANAGER_LABELS.has(role.trim().toLocaleLowerCase());
}

export function branchesMatch(left: string, right: string) {
  return normalizeReportBranch(left) === normalizeReportBranch(right);
}

export function normalizeReportBranch(branch: string) {
  return normalizeCompanyBranch(branch);
}

export function parseAssignedReportBranches(value: string | null | undefined) {
  return Array.from(new Set(String(value || "")
    .split(/[,;|\n]+/u)
    .map((branch) => branch.trim())
    .filter(Boolean)));
}

export function canAccessReportBranch(access: ReportBranchAccess, branch: string) {
  if (!access.isBranchManager && !access.isHumanResources) return true;
  return access.branches.some((assignedBranch) => branchesMatch(branch, assignedBranch));
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
  const isHumanResources = (user?.role || session.role).trim().toLocaleLowerCase() === "human resources";
  const normalizedRole = (user?.role || session.role).trim().toLocaleLowerCase();
  const normalizedPosition = (user?.position || "").trim().toLocaleLowerCase();
  const isDirector = ["admin", "system administrator", "executive viewer", "director"].includes(normalizedRole)
    || ["director", "managing director", "chief executive officer", "ceo"].includes(normalizedPosition);
  const branches = parseAssignedReportBranches(user?.branch);

  return {
    isBranchManager,
    isHumanResources,
    isDirector,
    branch: isBranchManager ? branches[0] || null : null,
    branches: isBranchManager || isHumanResources ? branches : [],
  };
}
