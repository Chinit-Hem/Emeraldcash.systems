import ExcelJS from "exceljs";

type Attachment = { imageUrl?: string; imageName?: string };
type CollectionRow = Attachment & { id: number; customer: string; amount: string; reason: string };
type ResolutionRow = Attachment & { id: number; customer: string; assetType: string; interest: string; penalty: string; principal: string; solution: string };
type DecisionRow = Attachment & { id: number; customer: string; type: string; amount: string; reason: string };

export type OperationReportExcelData = {
  reportDate: string;
  branch: string;
  reporterName: string;
  reporterRole: string;
  department: string;
  collectionDueRows: CollectionRow[];
  collectionPaidRows: CollectionRow[];
  dueNoticeRows: ResolutionRow[];
  followUpRows: ResolutionRow[];
  formalNoticeRows: ResolutionRow[];
  requestedRows: DecisionRow[];
  approvedRows: DecisionRow[];
  rejectedRows: DecisionRow[];
};

const GREEN = "006B2D";
const RED = "C00000";
const LIGHT = "E9EEF0";
const BORDER = "D6D9DD";
const KHMER_FONT = "Khmer OS Battambang";

function numberValue(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function nonEmpty<T extends { customer: string }>(rows: T[]) {
  return rows.filter((row) => row.customer.trim());
}

function excelReportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function styleCells(sheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number) {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = fromColumn; column <= toColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      cell.font = { name: KHMER_FONT, size: 11, ...cell.font };
      cell.alignment = { vertical: "middle", wrapText: true, ...cell.alignment };
      cell.border = {
        top: { style: "thin", color: { argb: BORDER } },
        left: { style: "thin", color: { argb: BORDER } },
        bottom: { style: "thin", color: { argb: BORDER } },
        right: { style: "thin", color: { argb: BORDER } },
      };
    }
  }
}

async function addBrandHeader(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, data: OperationReportExcelData, lastColumn: number) {
  const lastColumnLetter = sheet.getColumn(lastColumn).letter;
  sheet.mergeCells("A1:B3");
  sheet.mergeCells(`C1:${lastColumnLetter}2`);
  sheet.mergeCells(`C3:${lastColumnLetter}3`);
  sheet.getCell("C1").value = "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក";
  sheet.getCell("C1").font = { name: "Khmer OS Muol Light", size: 20, color: { argb: RED } };
  sheet.getCell("C1").alignment = { horizontal: "center", vertical: "middle", wrapText: false, shrinkToFit: true };
  sheet.getCell("C3").value = "របាយការណ៍លទ្ធផលប្រចាំថ្ងៃ សាខា បឹងកេងកង";
  sheet.getCell("C3").font = { name: "Khmer OS Muol Light", size: 14, color: { argb: GREEN } };
  sheet.getCell("C3").alignment = { horizontal: "center", vertical: "middle", wrapText: false, shrinkToFit: true };
  sheet.getRow(1).height = 36;
  sheet.getRow(2).height = 32;
  sheet.getRow(3).height = 30;

  try {
    const logoResponse = await fetch("/logo-horizontal.png");
    if (logoResponse.ok) {
      const bytes = new Uint8Array(await logoResponse.arrayBuffer());
      let binary = "";
      bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
      const imageId = workbook.addImage({ base64: `data:image/png;base64,${btoa(binary)}`, extension: "png" });
      sheet.addImage(imageId, { tl: { col: 0.2, row: 0.55 }, ext: { width: 160, height: 67 } });
    }
  } catch {
    sheet.getCell("A1").value = "Emerald Cash";
    sheet.getCell("A1").font = { bold: true, color: { argb: GREEN } };
  }

  const identityRows: Array<[string, string | Date | null]> = [
    ["កាលបរិច្ឆេទ៖", excelReportDate(data.reportDate)],
    ["ឈ្មោះ៖", data.reporterName],
    ["តួនាទី៖", data.reporterRole],
    ["នាយកដ្ឋាន៖", data.department],
  ];
  identityRows.forEach(([label, value], index) => {
    const row = 5 + index;
    sheet.mergeCells(row, 1, row, 3);
    sheet.mergeCells(row, 4, row, Math.min(lastColumn, 6));
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 1).font = { name: KHMER_FONT, bold: true };
    sheet.getCell(row, 1).alignment = { horizontal: "right", vertical: "middle" };
    const valueCell = sheet.getCell(row, 4);
    valueCell.value = value || "";
    if (value instanceof Date) valueCell.numFmt = "[$-en-US]dddd, dd mmmm yyyy";
    valueCell.alignment = { horizontal: "left", vertical: "middle" };
    sheet.getRow(row).height = 24;
  });
  styleCells(sheet, 1, 9, 1, lastColumn);
}

function addSectionTitle(sheet: ExcelJS.Worksheet, row: number, title: string, lastColumn: number, color = GREEN) {
  sheet.mergeCells(row, 1, row, lastColumn);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { name: KHMER_FONT, size: 13, bold: true, color: { argb: color } };
  cell.alignment = { vertical: "middle" };
  sheet.getRow(row).height = 26;
}

function addTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  headers: string[],
  rows: Array<Array<string | number | { text: string; hyperlink: string }>>,
  numericColumns: number[],
  totalColumns: number[],
  headerColor = GREEN
) {
  addSectionTitle(sheet, startRow, title, headers.length, headerColor);
  const headerRow = startRow + 1;
  headers.forEach((header, index) => {
    const cell = sheet.getCell(headerRow, index + 1);
    cell.value = header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } };
    cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: index === 0 ? "center" : "left", vertical: "middle", wrapText: true };
  });
  sheet.getRow(headerRow).height = 30;
  rows.forEach((values, rowIndex) => {
    const excelRow = headerRow + rowIndex + 1;
    values.forEach((value, columnIndex) => {
      const cell = sheet.getCell(excelRow, columnIndex + 1);
      cell.value = value;
      if (numericColumns.includes(columnIndex + 1)) {
        cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
        cell.alignment = { horizontal: "right", vertical: "middle" };
      }
    });
    sheet.getRow(excelRow).height = 25;
  });
  const totalRow = headerRow + rows.length + 1;
  const firstTotalColumn = Math.min(...totalColumns);
  if (firstTotalColumn > 2) sheet.mergeCells(totalRow, 1, totalRow, firstTotalColumn - 1);
  const totalLabel = sheet.getCell(totalRow, 1);
  totalLabel.value = "សរុប / Total";
  totalLabel.font = { name: KHMER_FONT, bold: true, color: { argb: RED } };
  totalLabel.alignment = { horizontal: "center", vertical: "middle" };
  totalColumns.forEach((column) => {
    const cell = sheet.getCell(totalRow, column);
    const firstDataRow = headerRow + 1;
    const lastDataRow = Math.max(firstDataRow, totalRow - 1);
    cell.value = rows.length ? { formula: `SUM(${sheet.getColumn(column).letter}${firstDataRow}:${sheet.getColumn(column).letter}${lastDataRow})` } : 0;
    cell.numFmt = "$#,##0.00;[Red]-$#,##0.00";
    cell.font = { name: KHMER_FONT, bold: true, color: { argb: RED } };
  });
  for (let column = 1; column <= headers.length; column += 1) {
    sheet.getCell(totalRow, column).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
  }
  sheet.getRow(totalRow).height = 28;
  styleCells(sheet, startRow, totalRow, 1, headers.length);
  return totalRow + 2;
}

function photoLink(row: Attachment) {
  return row.imageUrl ? { text: row.imageName || "View photo", hyperlink: row.imageUrl } : "";
}

function configureSheet(sheet: ExcelJS.Worksheet, widths: number[], landscape = true) {
  widths.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.views = [{ state: "frozen", ySplit: 10 }];
  sheet.pageSetup = { orientation: landscape ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9, margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 } };
  sheet.headerFooter.oddFooter = "Page &P of &N";
}

export async function exportOperationReportExcel(data: OperationReportExcelData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Emerald Cash Operation Report";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("របាយការណ៍សង្ខេប");
  configureSheet(summary, [7, 20, 20, 16, 16, 16, 16, 32]);
  await addBrandHeader(workbook, summary, data, 8);
  const dueCount = nonEmpty(data.collectionDueRows).length;
  const paidCount = nonEmpty(data.collectionPaidRows).length;
  const summaryRows: Array<Array<string | number>> = [
    ["អតិថិជនត្រូវបង់សរុប", dueCount, ""],
    ["អតិថិជនដែលបានបង់សរុប", paidCount, ""],
    ["អត្រាប្រមូលចូលគិតជាភាគរយ", dueCount ? paidCount / dueCount : 0, ""],
    ["ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", nonEmpty(data.dueNoticeRows).length, data.dueNoticeRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
    ["បានបន្តទាក់ទងអតិថិជនដែលយ៉ឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", nonEmpty(data.followUpRows).length, data.followUpRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
    ["ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយ៉ឺតចាប់ពី ៤ថ្ងៃ", nonEmpty(data.formalNoticeRows).length, data.formalNoticeRows.reduce((sum, row) => sum + numberValue(row.interest), 0)],
  ];
  const addSummaryBand = (headerRow: number, headers: string[], values: Array<Array<string | number>>) => {
    summary.mergeCells(headerRow, 1, headerRow, 2);
    summary.mergeCells(headerRow, 3, headerRow, 4);
    summary.mergeCells(headerRow, 5, headerRow, 8);
    [1, 3, 5].forEach((column, index) => {
      const cell = summary.getCell(headerRow, column);
      cell.value = headers[index];
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.font = { name: KHMER_FONT, bold: true, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    values.forEach(([label, count, amount], index) => {
      const row = headerRow + index + 1;
      summary.mergeCells(row, 1, row, 2);
      summary.mergeCells(row, 3, row, 4);
      summary.mergeCells(row, 5, row, 8);
      summary.getCell(row, 1).value = label;
      summary.getCell(row, 3).value = count;
      summary.getCell(row, 3).alignment = { horizontal: "center", vertical: "middle" };
      summary.getCell(row, 5).value = amount;
    });
  };
  addSummaryBand(11, ["ការប្រមូល", "ចំនួនអតិថិជន (នាក់)", "ចំនួនទឹកប្រាក់"], summaryRows.slice(0, 3));
  addSummaryBand(15, ["ការដោះស្រាយ", "ចំនួន (នាក់)", "ជាសាច់ប្រាក់ (សរុបគិតជាដុល្លារ)"], summaryRows.slice(3));
  summary.getCell("C14").numFmt = "0%";
  [16, 17, 18].forEach((row) => { summary.getCell(row, 5).numFmt = "$#,##0.00"; });
  styleCells(summary, 11, 18, 1, 8);

  const collection = workbook.addWorksheet("អតិថិជនប្រមូល&ដោះស្រាយ");
  configureSheet(collection, [7, 26, 20, 16, 16, 18, 30, 18]);
  await addBrandHeader(workbook, collection, data, 8);
  let row = 11;
  row = addTable(collection, row, "អតិថិជនដែលត្រូវប្រមូលសរុប", ["ល.រ", "ឈ្មោះអតិថិជន", "ជាសាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(data.collectionDueRows).map((item, index) => [index + 1, item.customer, numberValue(item.amount), item.reason, photoLink(item)]), [3], [3]);
  row = addTable(collection, row, "អតិថិជនដែលប្រមូលបានសរុប", ["ល.រ", "ឈ្មោះអតិថិជន", "ជាសាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(data.collectionPaidRows).map((item, index) => [index + 1, item.customer, numberValue(item.amount), item.reason, photoLink(item)]), [3], [3], RED);
  const addResolution = (title: string, rows: ResolutionRow[]) => addTable(collection, row, title, ["ល.រ", "ឈ្មោះអតិថិជន", "ប្រភេទទ្រព្យ", "ការប្រាក់ ($)", "ពិន័យ ($)", "ប្រាក់ដើម ($)", "មូលហេតុ / ដំណោះស្រាយ", "រូបភាព"], nonEmpty(rows).map((item, index) => [index + 1, item.customer, item.assetType, numberValue(item.interest), numberValue(item.penalty), numberValue(item.principal), item.solution, photoLink(item)]), [4, 5, 6], [4, 5, 6]);
  row = addResolution("ជូនដំណឹងទៅអតិថិជន ដល់ថ្ងៃកំណត់ត្រូវបង់", data.dueNoticeRows);
  row = addResolution("បានបន្តទាក់ទងអតិថិជនដែលយ៉ឺតចាប់ពី ១ថ្ងៃ ដល់ ៣ថ្ងៃ", data.followUpRows);
  addResolution("ផ្ញើលិខិតជូនដំណឹងផ្លូវការសម្រាប់អតិថិជនយ៉ឺតចាប់ពី ៤ថ្ងៃ", data.formalNoticeRows);

  const decisions = workbook.addWorksheet("ឥណទានស្នើសុំ-អនុម័ត-បដិសេធ");
  configureSheet(decisions, [7, 30, 22, 18, 34, 18]);
  await addBrandHeader(workbook, decisions, data, 6);
  let decisionRow = 11;
  const addDecision = (title: string, rows: DecisionRow[], color = GREEN) => addTable(decisions, decisionRow, title, ["ល.រ", "ឈ្មោះអតិថិជន", "ប្រភេទឥណទាន", "សាច់ប្រាក់ ($)", "មូលហេតុ", "រូបភាព"], nonEmpty(rows).map((item, index) => [index + 1, item.customer, item.type, numberValue(item.amount), item.reason, photoLink(item)]), [4], [4], color);
  decisionRow = addDecision("អតិថិជនដែលស្នើឥណទាន", data.requestedRows);
  decisionRow = addDecision("អតិថិជនដែលបានអនុម័ត", data.approvedRows);
  addDecision("អតិថិជនដែលបានបដិសេធ", data.rejectedRows, RED);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `operation-report-${data.reportDate || new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return buffer;
}
