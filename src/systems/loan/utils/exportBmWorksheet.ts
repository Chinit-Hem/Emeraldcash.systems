import { BM_KPIS, bmKpiValues, emptyBmKpis, emptyBmPeriods, type BmWorksheet } from "./bmWorksheet.ts";

export async function exportBmWorksheet(data: BmWorksheet, report: { reportDate: string; branch: string; reporterName: string; department?: string }) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("សង្ខេបប្រចាំសាខា (Dashboard)");
  sheet.columns = [{ width: 7 }, { width: 48 }, { width: 23 }, { width: 23 }, { width: 30 }, { width: 24 }, { width: 38 }];
  const band = (row: number, title: string, width = 7, target = sheet) => {
    target.mergeCells(row, 1, row, width);
    const cell = target.getCell(row, 1);
    cell.value = title;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF087323" } };
    cell.font = { name: "Khmer OS Battambang", bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    target.getRow(row).height = 38;
  };
  const number = (value: string) => value === "" ? null : Number(value);
  band(1, "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក");
  band(3, "របាយការណ៍សង្ខេបលទ្ធផលប្រចាំថ្ងៃ - ថ្នាក់ប្រធានសាខា (Branch Manager Daily Report)");
  sheet.mergeCells("A4:B4"); sheet.getCell("A4").value = "សាខា៖"; sheet.mergeCells("C4:D4"); sheet.getCell("C4").value = report.branch;
  sheet.getCell("E4").value = "កាលបរិច្ឆេទ៖"; sheet.mergeCells("F4:G4"); sheet.getCell("F4").value = new Date(`${report.reportDate}T00:00:00Z`); sheet.getCell("F4").numFmt = "yyyy-mm-dd";
  sheet.mergeCells("A5:B5"); sheet.getCell("A5").value = "ឈ្មោះប្រធានសាខា៖"; sheet.mergeCells("C5:D5"); sheet.getCell("C5").value = report.reporterName;
  sheet.getCell("E5").value = "នាយកដ្ឋាន៖"; sheet.mergeCells("F5:G5"); sheet.getCell("F5").value = report.department || "Loan Operations";
  band(7, "១. សង្ខេបសូចនាករផលសម្រេចគន្លឹះរបស់សាខា (Branch Key KPI Summary)");
  sheet.getRow(8).values = ["ល.រ", "សូចនាករគន្លឹះ (KPIs)", "គោលដៅប្រចាំខែ", "សម្រេចបានថ្ងៃនេះ", "សម្រេចបានសរុបប្រចាំខែ", "% សម្រេចធៀប KPI", "កំណត់សម្គាល់"];
  const kpis = data.kpis || emptyBmKpis();
  BM_KPIS.forEach(([id, label, , percent], index) => {
    const row = kpis.find((entry) => entry.id === id) || { id, target: "", daily: "", monthly: "", note: "" };
    const r = index + 9;
    const numeric = (value: string) => value === "" ? null : Number(value) / (percent ? 100 : 1);
    sheet.getRow(r).values = [index + 1, label, numeric(row.target), numeric(row.daily), numeric(row.monthly), null, row.note];
    const result = bmKpiValues(kpis, row);
    if (id === "collectionRate") {
      sheet.getCell(`D${r}`).value = { formula: 'IF(OR(C12="",C12=0,D12=""),"",D12/C12)', result: result.daily === "" ? "" : Number(result.daily) / 100 };
      sheet.getCell(`E${r}`).value = { formula: 'IF(OR(C12="",C12=0,E12=""),"",E12/C12)', result: result.monthly === "" ? "" : Number(result.monthly) / 100 };
    }
    sheet.getCell(`F${r}`).value = { formula: `IF(OR(C${r}="",C${r}=0,E${r}=""),"",E${r}/C${r})`, result: result.achievement ?? "" };
    ["C", "D", "E"].forEach((column) => { sheet.getCell(`${column}${r}`).numFmt = percent ? "0.00%" : ["disbursed", "collected"].includes(id) ? '"$"#,##0.00' : "#,##0"; });
    sheet.getCell(`F${r}`).numFmt = "0.00%";
    sheet.getRow(r).height = 48;
  });
  band(20, "២. សង្ខេបលទ្ធផលតាមអ្នកឯកទេសផ្ដល់កម្ចី (Staff Performance Breakdown)");
  sheet.getRow(21).values = ["ល.រ", "ឈ្មោះអ្នកឯកទេសផ្ដល់កម្ចី", "ស្នើសុំ ($)", "អនុម័ត ($)", "បដិសេធ ($)", "ប្រមូលបាន ($)", "អតិថិជនដោះស្រាយ (នាក់)"];
  data.staff.forEach((row, index) => { sheet.getRow(index + 22).values = [index + 1, row.name, number(row.requested), number(row.approved), number(row.rejected), number(row.collected), number(row.contacts)]; });
  const totalRow = 22 + Math.max(1, data.staff.length);
  sheet.mergeCells(totalRow, 1, totalRow, 2); sheet.getCell(totalRow, 1).value = "សរុប";
  ["requested", "approved", "rejected", "collected", "contacts"].forEach((key, index) => {
    const column = String.fromCharCode(67 + index);
    sheet.getCell(totalRow, index + 3).value = { formula: `SUM(${column}22:${column}${totalRow - 1})`, result: data.staff.reduce((sum, row) => sum + Number(row[key as keyof typeof row] || 0), 0) };
  });
  const issuesStart = Math.max(29, totalRow + 3);
  band(issuesStart, "៣. បញ្ហាប្រឈមគន្លឹះ និង ផែនការសកម្មភាពដោះស្រាយរបស់ប្រធានសាខា (Key Issues & Action Plan)");
  sheet.getRow(issuesStart + 1).values = ["ល.រ", "បញ្ហាប្រឈម / ករណីយឺតយ៉ាវ", "ឈ្មោះអតិថិជន/មន្ត្រី", "ប្រាក់ដើម ($)", "ដំណោះស្រាយ/សកម្មភាពឆ្លើយតប", "អ្នកទទួលខុសត្រូវ", "កាលបរិច្ឆេទបញ្ចប់"];
  (data.issues || []).forEach((row, index) => { const r = issuesStart + 2 + index; sheet.getRow(r).values = [index + 1, row.issue, row.name, number(row.principal), row.action, row.owner, row.deadline ? new Date(`${row.deadline}T00:00:00Z`) : null]; sheet.getCell(r, 7).numFmt = "yyyy-mm-dd"; });
  if (data.notes) sheet.addRow(["កំណត់សម្គាល់", data.notes]);
  const periods = workbook.addWorksheet("ប្រចាំថ្ងៃ-ខែ-ឆ្នាំ");
  periods.columns = Array.from({ length: 10 }, () => ({ width: 20 }));
  band(1, "ក្រុមហ៊ុន អេមើរ៉ល ឃែស ឯ.ក", 10, periods);
  band(3, "ទិន្នន័យប្រកាសសរុបពីអ្នកឯកទេសផ្ដល់កម្ចីទាំងអស់ប្រចាំថ្ងៃ", 10, periods);
  band(5, "សង្ខេបទិន្នន័យ BM ប្រចាំថ្ងៃ / ខែ / ឆ្នាំ", 10, periods);
  periods.getRow(6).values = ["រយៈពេល", "កាលបរិច្ឆេទ", "LS Reports", "Account Reports", "សំណើឥណទាន", "អនុម័តឥណទាន", "ប្រាក់អនុម័ត ($)", "ត្រូវប្រមូល", "ប្រមូលបាន", "ប្រាក់ប្រមូលបាន ($)"];
  (data.periods || emptyBmPeriods()).forEach((row, index) => { periods.getRow(index + 7).values = [["ប្រចាំថ្ងៃ", "ប្រចាំខែ", "ប្រចាំឆ្នាំ"][index], report.reportDate.slice(0, [10, 7, 4][index]), ...[row.lsReports, row.accountReports, row.requested, row.approved, row.approvedAmount, row.due, row.paid, row.collected].map(number)]; });
  periods.mergeCells("A11:J11"); periods.getCell("A11").value = "រយៈពេលទាំងនេះត្រួតគ្នា — មិនបូកសរុបចូលគ្នា។";
  for (const r of [8, 21, issuesStart + 1]) {
    sheet.getRow(r).height = 52;
    sheet.getRow(r).eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF087323" } }; cell.font = { name: "Khmer OS Battambang", bold: true, color: { argb: "FFFFFFFF" }, size: 11 }; });
  }
  for (let r = 22; r <= totalRow; r++) {
    [3, 4, 5, 6].forEach((column) => { sheet.getCell(r, column).numFmt = '"$"#,##0.00'; });
    sheet.getCell(r, 7).numFmt = "#,##0";
  }
  sheet.getRow(totalRow).eachCell((cell) => { cell.font = { name: "Khmer OS Battambang", bold: true, color: { argb: "FFDC2626" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF0" } }; });
  periods.getRow(6).height = 52;
  periods.getRow(6).eachCell((cell) => { cell.font = { name: "Khmer OS Battambang", bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF087323" } }; });
  workbook.eachSheet((target) => {
    target.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    target.eachRow((row) => { row.height = row.height || 32; row.eachCell((cell) => { cell.alignment = { vertical: "middle", wrapText: true }; if (!cell.font) cell.font = { name: "Khmer OS Battambang", size: 11 }; cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } }; }); });
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a"); link.href = url; link.download = `branch-manager-report-${report.reportDate}.xlsx`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
