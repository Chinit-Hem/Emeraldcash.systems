import { queryWithRetry, sql } from "@/lib/db-singleton";
import { branchesMatch, parseAssignedReportBranches } from "@/systems/loan/api/reportBranchAccess";
import { isBranchManagerReportActor, isDirectorReportActor, isHumanResourcesReportActor } from "@/systems/loan/utils/reportWorkflowRoles";

type RecipientRow = { username: string; role: string; position: string | null; branch: string | null };

export async function getReportNotificationRecipients(branch: string, audience: "branch" | "management" | "director", excludeUsername: string) {
  const rows = await queryWithRetry(async () => sql<RecipientRow>`
    SELECT username, role, position, branch FROM users
    WHERE username <> ${excludeUsername}
  `, "reportNotificationRecipients");
  return rows.filter((row) => {
    const isAdminOrDirector = isDirectorReportActor(row.role, row.position);
    if (audience === "director") return isAdminOrDirector;
    if (audience === "management") {
      if (isAdminOrDirector) return false;
      return isHumanResourcesReportActor(row.role, row.position) && parseAssignedReportBranches(row.branch).some((assigned) => branchesMatch(assigned, branch));
    }
    const isBranchManager = isBranchManagerReportActor(row.role, row.position);
    return isBranchManager && parseAssignedReportBranches(row.branch).some((assigned) => branchesMatch(assigned, branch));
  }).map((row) => row.username);
}
