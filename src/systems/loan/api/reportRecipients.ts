import { queryWithRetry, sql } from "@/lib/db-singleton";
import { branchesMatch, parseAssignedReportBranches } from "@/systems/loan/api/reportBranchAccess";

type RecipientRow = { username: string; role: string; position: string | null; branch: string | null };

export async function getReportNotificationRecipients(branch: string, audience: "branch" | "management" | "director", excludeUsername: string) {
  const rows = await queryWithRetry(async () => sql<RecipientRow>`
    SELECT username, role, position, branch FROM users
    WHERE username <> ${excludeUsername}
  `, "reportNotificationRecipients");
  return rows.filter((row) => {
    const role = row.role.trim().toLocaleLowerCase();
    const position = (row.position || "").trim().toLocaleLowerCase();
    const isAdminOrDirector = ["admin", "system administrator", "executive viewer", "director"].includes(role)
      || ["director", "managing director", "chief executive officer", "ceo"].includes(position);
    if (audience === "director") return isAdminOrDirector;
    if (audience === "management") {
      if (isAdminOrDirector) return false;
      return role === "human resources" && parseAssignedReportBranches(row.branch).some((assigned) => branchesMatch(assigned, branch));
    }
    const isBranchManager = ["manager / approver", "branch manager", "bm", "credit manager", "credit / approver"].includes(role)
      || ["branch manager", "bm", "credit manager", "credit / approver"].includes(position);
    return isBranchManager && parseAssignedReportBranches(row.branch).some((assigned) => branchesMatch(assigned, branch));
  }).map((row) => row.username);
}
