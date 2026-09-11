/** Personal history must never narrow the branch reports used for BM generation. */
export function getReportRecordScopes<T extends { reporterUsername: string }>(records: T[], username: string, canViewBranchReports: boolean) {
  const ownRecords = records.filter((record) => record.reporterUsername.trim().toLowerCase() === username.trim().toLowerCase());
  return { sourceRecords: canViewBranchReports ? records : ownRecords, ownRecords };
}
