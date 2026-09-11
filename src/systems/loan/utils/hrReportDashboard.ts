export type HrReportFilter = { from: string; to: string; status: string };
export type HrDatePreset = "all" | "today" | "yesterday" | "thisWeek" | "lastWeek" | "thisMonth" | "lastMonth" | "custom";

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shifted(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function getHrDatePresetRange(preset: HrDatePreset, reference = new Date()) {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const mondayOffset = (today.getDay() + 6) % 7;
  const thisMonday = shifted(today, -mondayOffset);

  if (preset === "today") return { from: dateInputValue(today), to: dateInputValue(today) };
  if (preset === "yesterday") {
    const yesterday = shifted(today, -1);
    return { from: dateInputValue(yesterday), to: dateInputValue(yesterday) };
  }
  if (preset === "thisWeek") return { from: dateInputValue(thisMonday), to: dateInputValue(today) };
  if (preset === "lastWeek") return { from: dateInputValue(shifted(thisMonday, -7)), to: dateInputValue(shifted(thisMonday, -1)) };
  if (preset === "thisMonth") return { from: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateInputValue(today) };
  if (preset === "lastMonth") return {
    from: dateInputValue(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    to: dateInputValue(new Date(today.getFullYear(), today.getMonth(), 0)),
  };
  return { from: "", to: "" };
}

export function filterHrReports<T extends { reportDate: string; status: string }>(reports: T[], filter: HrReportFilter) {
  return reports.filter((report) => (!filter.from || report.reportDate >= filter.from)
    && (!filter.to || report.reportDate <= filter.to)
    && (!filter.status || report.status === filter.status));
}
