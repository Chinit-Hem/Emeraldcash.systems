import { queryWithRetry, sql } from "@/lib/db-singleton";

type RecipientRow = { username: string };

export async function getReportNotificationRecipients(branch: string, audience: "branch" | "management", excludeUsername: string) {
  const normalizedBranch = branch.trim();
  const rows = await queryWithRetry(async () => sql<RecipientRow>`
    SELECT username FROM users
    WHERE username <> ${excludeUsername}
      AND (
        LOWER(BTRIM(role)) IN ('admin', 'executive viewer')
        OR (
          LOWER(BTRIM(role)) IN ('manager / approver', 'branch manager', 'bm', 'credit manager')
          AND (
            ${audience} = 'management'
            OR ${normalizedBranch} = ''
            OR LOWER(BTRIM(COALESCE(branch, ''))) = LOWER(BTRIM(${normalizedBranch}))
          )
        )
      )
  `, "reportNotificationRecipients");
  return rows.map((row) => row.username);
}
