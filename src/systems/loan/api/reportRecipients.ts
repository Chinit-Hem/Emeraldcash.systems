import { queryWithRetry, sql } from "@/lib/db-singleton";
import { normalizeReportBranch } from "@/systems/loan/api/reportBranchAccess";

type RecipientRow = { username: string };

export async function getReportNotificationRecipients(branch: string, _audience: "branch" | "management", excludeUsername: string) {
  const normalizedBranch = branch.trim();
  const branchKey = normalizeReportBranch(normalizedBranch);
  const rows = await queryWithRetry(async () => sql<RecipientRow>`
    SELECT username FROM users
    WHERE username <> ${excludeUsername}
      AND (
        (
          LOWER(BTRIM(role)) IN ('admin', 'executive viewer')
          AND LOWER(BTRIM(COALESCE(position, ''))) NOT IN ('branch manager', 'bm')
        )
        OR (
          (
            LOWER(BTRIM(role)) IN ('manager / approver', 'branch manager', 'bm', 'credit manager')
            OR LOWER(BTRIM(COALESCE(position, ''))) IN ('branch manager', 'bm')
          )
          AND (
            ${branchKey} = ''
            OR CASE
              WHEN REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g') LIKE '%sensok%' OR REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g') LIKE '%សែនសុខ%' THEN 'sen-sok'
              WHEN REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g') LIKE '%boeungkengkang%' OR REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g') LIKE '%bkk%' OR REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g') LIKE '%បឹងកេងកង%' THEN 'bkk'
              ELSE REGEXP_REPLACE(LOWER(COALESCE(branch, '')), '[[:space:]​_-]+', '', 'g')
            END = ${branchKey}
          )
        )
      )
  `, "reportNotificationRecipients");
  return rows.map((row) => row.username);
}
