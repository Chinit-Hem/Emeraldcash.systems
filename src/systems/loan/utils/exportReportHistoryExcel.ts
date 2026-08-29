import ExcelJS from "exceljs";

type HistoryRow = {
  customer: string;
  amount?: string;
  reason?: string;
  assetType?: string;
  type?: string;
  interest?: string;
  penalty?: string;
  principal?: string;
  note?: string;
  solution?: string;
};

type ReportRecordBase = {
  reportDate: string;
  reporterUsername: string;
  reporterName: string;
  reporterPosition: string;
  department: string;
  branch: string;
  status: string;
};

export type AccountHistoryRecord = ReportRecordBase & {
  data: {
    dueRows?: HistoryRow[];
    paidRows?: HistoryRow[];
    dueNoticeRows?: HistoryRow[];
    promiseRows?: HistoryRow[];
    closedRows?: HistoryRow[];
  };
};

export type LsHistoryRecord = ReportRecordBase & {
  data: {
    collectionDueRows?: HistoryRow[];
    collectionPaidRows?: HistoryRow[];
    dueNoticeRows?: HistoryRow[];
    followUpRows?: HistoryRow[];
    formalNoticeRows?: HistoryRow[];
    requestedRows?: HistoryRow[];
    approvedRows?: HistoryRow[];
    rejectedRows?: HistoryRow[];
  };
};

const GREEN = "087323";
const BORDER = "CBD5E1";
const FONT = "Khmer OS Battambang";

function filled(rows: HistoryRow[] | undefined) {
  return (rows || []).filter((row) => row.customer?.trim());
}

function amount(value: string | undefined) {
  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.font = { name: FONT, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: BORDER } },
      left: { style: "thin", color: { argb: BORDER } },
      bottom: { style: "thin", color: { argb: BORDER } },
      right: { style: "thin", color: { argb: BORDER } },
    };
  });
}

function styleBody(sheet: ExcelJS.Worksheet, fromRow: number) {
  for (let rowIndex = fromRow; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell((cell) => {
      cell.font = { name: FONT, size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    });
    if (rowIndex % 2 === 0) row.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8FAFC" } }; });
  }
}

function addTitle(sheet: ExcelJS.Worksheet, title: string, periodLabel: string, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { name: FONT, size: 18, bold: true, color: { argb: GREEN } };
  sheet.getCell(1, 1).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 32;
  sheet.mergeCells(2, 1, 2, columns);
  sheet.getCell(2, 1).value = `Report period: ${periodLabel}`;
  sheet.getCell(2, 1).font = { name: FONT, size: 11, italic: true, color: { argb: "475569" } };
  sheet.getCell(2, 1).alignment = { horizontal: "center" };
}

async function download(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "all";
}

export async function exportAccountReportHistoryExcel(records: AccountHistoryRecord[], periodLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash Account Reports";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("Account Report Summary", { views: [{ state: "frozen", ySplit: 4 }] });
  addTitle(summary, "Account Report Summary", periodLabel, 11);
  summary.addRow([]);
  const summaryHeader = summary.addRow(["Date", "Reporter", "Username", "Position", "Department", "Branch", "Status", "Due", "Paid", "Due Notices", "Resolved / Follow-up"]);
  styleHeader(summaryHeader);
  records.forEach((record) => summary.addRow([record.reportDate, record.reporterName, record.reporterUsername, record.reporterPosition, record.department, record.branch, record.status, filled(record.data.dueRows).length, filled(record.data.paidRows).length, filled(record.data.dueNoticeRows).length, filled(record.data.promiseRows).length + filled(record.data.closedRows).length]));
  summary.columns = [{ width: 14 }, { width: 24 }, { width: 18 }, { width: 22 }, { width: 20 }, { width: 20 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 20 }];
  styleBody(summary, 5);
  summary.autoFilter = { from: "A4", to: "K4" };

  const details = workbook.addWorksheet("Account Activities", { views: [{ state: "frozen", ySplit: 4 }] });
  addTitle(details, "Account Report Activities", periodLabel, 12);
  details.addRow([]);
  const detailsHeader = details.addRow(["Date", "Reporter", "Branch", "Category", "Customer", "Asset Type", "Amount", "Interest", "Penalty", "Principal", "Reason / Note", "Status"]);
  styleHeader(detailsHeader);
  const categories: Array<[keyof AccountHistoryRecord["data"], string]> = [["dueRows", "Collection Due"], ["paidRows", "Collection Paid"], ["dueNoticeRows", "Due Notice"], ["promiseRows", "Follow-up / Promise"], ["closedRows", "Formal Notice / Closed"]];
  records.forEach((record) => categories.forEach(([key, label]) => filled(record.data[key]).forEach((row) => details.addRow([record.reportDate, record.reporterName, record.branch, label, row.customer, row.assetType || "", amount(row.amount), amount(row.interest), amount(row.penalty), amount(row.principal), row.reason || row.note || "", record.status]))));
  details.columns = [{ width: 14 }, { width: 24 }, { width: 20 }, { width: 22 }, { width: 28 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 36 }, { width: 14 }];
  [7, 8, 9, 10].forEach((column) => { details.getColumn(column).numFmt = "$#,##0.00;[Red]-$#,##0.00"; });
  styleBody(details, 5);
  details.autoFilter = { from: "A4", to: "L4" };
  await download(workbook, `account-reports-${safeFilename(periodLabel)}.xlsx`);
}

export async function exportLsReportHistoryExcel(records: LsHistoryRecord[], periodLabel: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash LS Reports";
  workbook.created = new Date();
  const summary = workbook.addWorksheet("LS Report Summary", { views: [{ state: "frozen", ySplit: 4 }] });
  addTitle(summary, "Loan Specialist Report Summary", periodLabel, 13);
  summary.addRow([]);
  const summaryHeader = summary.addRow(["Date", "Loan Specialist", "Username", "Position", "Department", "Branch", "Status", "Due", "Paid", "Requested", "Approved", "Rejected", "Resolution Actions"]);
  styleHeader(summaryHeader);
  records.forEach((record) => summary.addRow([record.reportDate, record.reporterName, record.reporterUsername, record.reporterPosition, record.department, record.branch, record.status, filled(record.data.collectionDueRows).length, filled(record.data.collectionPaidRows).length, filled(record.data.requestedRows).length, filled(record.data.approvedRows).length, filled(record.data.rejectedRows).length, filled(record.data.dueNoticeRows).length + filled(record.data.followUpRows).length + filled(record.data.formalNoticeRows).length]));
  summary.columns = [{ width: 14 }, { width: 24 }, { width: 18 }, { width: 22 }, { width: 20 }, { width: 20 }, { width: 14 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 18 }];
  styleBody(summary, 5);
  summary.autoFilter = { from: "A4", to: "M4" };

  const details = workbook.addWorksheet("LS Activities", { views: [{ state: "frozen", ySplit: 4 }] });
  addTitle(details, "Loan Specialist Report Activities", periodLabel, 12);
  details.addRow([]);
  const detailsHeader = details.addRow(["Date", "Loan Specialist", "Branch", "Category", "Customer", "Asset / Loan Type", "Amount", "Interest", "Penalty", "Principal", "Reason / Solution", "Status"]);
  styleHeader(detailsHeader);
  const categories: Array<[keyof LsHistoryRecord["data"], string]> = [["collectionDueRows", "Collection Due"], ["collectionPaidRows", "Collection Paid"], ["dueNoticeRows", "Due Notice"], ["followUpRows", "Follow-up"], ["formalNoticeRows", "Formal Notice"], ["requestedRows", "Loan Requested"], ["approvedRows", "Loan Approved"], ["rejectedRows", "Loan Rejected"]];
  records.forEach((record) => categories.forEach(([key, label]) => filled(record.data[key]).forEach((row) => details.addRow([record.reportDate, record.reporterName, record.branch, label, row.customer, row.assetType || row.type || "", amount(row.amount), amount(row.interest), amount(row.penalty), amount(row.principal), row.reason || row.solution || "", record.status]))));
  details.columns = [{ width: 14 }, { width: 24 }, { width: 20 }, { width: 20 }, { width: 28 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 36 }, { width: 14 }];
  [7, 8, 9, 10].forEach((column) => { details.getColumn(column).numFmt = "$#,##0.00;[Red]-$#,##0.00"; });
  styleBody(details, 5);
  details.autoFilter = { from: "A4", to: "L4" };
  await download(workbook, `ls-reports-${safeFilename(periodLabel)}.xlsx`);
}
