export type CustomerReportRow = { customer: string };

export function reportNumber(value: string | number | null | undefined): number {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function duplicateCustomerNames<TRow extends CustomerReportRow>(rows: TRow[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = row.customer.trim().toLocaleLowerCase();
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name);
}

export function duplicateCustomerNamesBySection<TSections extends Record<string, CustomerReportRow[]>>(sections: TSections): { [TKey in keyof TSections]: string[] } {
  return Object.fromEntries(Object.entries(sections).map(([key, rows]) => [key, duplicateCustomerNames(rows)])) as { [TKey in keyof TSections]: string[] };
}

export function collectionMetrics<TRow extends CustomerReportRow & { amount: string }>(dueRows: TRow[], paidRows: TRow[]) {
  const populated = (rows: TRow[]) => rows.filter((row) => row.customer.trim());
  const due = populated(dueRows);
  const paid = populated(paidRows);
  const dueAmount = due.reduce((total, row) => total + reportNumber(row.amount), 0);
  const paidAmount = paid.reduce((total, row) => total + reportNumber(row.amount), 0);
  return {
    dueCount: due.length,
    paidCount: paid.length,
    dueAmount,
    paidAmount,
    customerRate: due.length ? Math.round((paid.length / due.length) * 100) : 0,
    amountRate: dueAmount ? Math.round((paidAmount / dueAmount) * 100) : 0,
  };
}
