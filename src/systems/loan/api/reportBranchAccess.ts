import type { SessionPayload } from "@/lib/auth";
import { queryWithRetry, sql } from "@/lib/db-singleton";
import { normalizeCompanyBranch } from "@/shared/utils/branchNames";
import {
  canPrepareAccountReport,
  canPrepareLoanSpecialistReport,
  isBranchManagerReportActor,
  isDirectorReportActor,
  isHumanResourcesReportActor,
  isReportAdministrator,
} from "@/systems/loan/utils/reportWorkflowRoles";

type UserBranchRow = { role: string; position: string | null; branch: string | null };

export type ReportBranchAccess = {
  isBranchManager: boolean;
  isHumanResources: boolean;
  isDirector: boolean;
  isAdministrator: boolean;
  canPrepareAccountReport: boolean;
  canPrepareLoanSpecialistReport: boolean;
  branch: string | null;
  branches: string[];
};

export function isBranchManagerRole(role: string) {
  return isBranchManagerReportActor(role);
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

/** HR can read reports across the company; review/write checks stay separate. */
export function canViewReportBranch(access: ReportBranchAccess, branch: string) {
  return access.isHumanResources || canAccessReportBranch(access, branch);
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
  const role = user?.role || session.role;
  const position = user?.position || "";
  const isBranchManager = isBranchManagerReportActor(role, position);
  const isHumanResources = isHumanResourcesReportActor(role, position);
  const isDirector = isDirectorReportActor(role, position);
  const isAdministrator = isReportAdministrator(role);
  const branches = parseAssignedReportBranches(user?.branch);

  return {
    isBranchManager,
    isHumanResources,
    isDirector,
    isAdministrator,
    canPrepareAccountReport: canPrepareAccountReport(role, position),
    canPrepareLoanSpecialistReport: canPrepareLoanSpecialistReport(role, position),
    branch: isBranchManager ? branches[0] || null : null,
    branches,
  };
}
