import { money } from './utils';

export async function shareOrDownloadBlob(blob: Blob, filename: string, mimeType: string) {
  try {
    const file = new File([blob], filename, { type: mimeType });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: filename });
      return;
    }
  } catch {
    // user cancelled the share sheet, or file-sharing isn't supported — fall through to download
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Shared brand colors (RGB, matching the app's navy/teal/gold palette)
const RGB_NAVY: [number, number, number] = [15, 42, 63];
const RGB_TEAL: [number, number, number] = [20, 149, 143];
const RGB_TEAL_LIGHT: [number, number, number] = [230, 246, 245];
const RGB_GOLD: [number, number, number] = [217, 154, 43];
const RGB_GREEN: [number, number, number] = [22, 101, 52];
const RGB_GREEN_LIGHT: [number, number, number] = [220, 252, 231];
const RGB_RED: [number, number, number] = [185, 28, 28];
const RGB_RED_LIGHT: [number, number, number] = [254, 226, 226];
const RGB_AMBER_LIGHT: [number, number, number] = [254, 243, 199];
const RGB_AMBER: [number, number, number] = [146, 64, 14];

function drawPageBorder(doc: any) {
  doc.setDrawColor(...RGB_NAVY);
  doc.setLineWidth(0.5);
  doc.rect(6, 6, 198, 285);
}

/** Full-width colored banner at the top of a page, with a title and optional subtitle. */
function drawBanner(doc: any, title: string, subtitle: string) {
  doc.setFillColor(...RGB_NAVY);
  doc.rect(6, 6, 198, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(fitTextWidth(doc, title, 190), 12, 17);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(fitTextWidth(doc, subtitle, 190), 12, 24);
  doc.setTextColor(0, 0, 0);
}

/** Full-width colored footer bar at the bottom of the page, showing total figures. */
function drawFooter(doc: any, figures: [string, string][]) {
  const footerY = 279;
  doc.setFillColor(...RGB_GOLD);
  doc.rect(6, footerY, 198, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const n = figures.length;
  const colW = 198 / n;
  figures.forEach(([label, value], i) => {
    const x = 6 + colW * i + colW / 2;
    doc.text(`${label}: ${value}`, x, footerY + 7.5, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

/** A colored, bordered stat box — like a small stat card. Returns nothing, just draws. */
function drawStatBox(doc: any, x: number, y: number, w: number, h: number, label: string, value: string, fill: [number, number, number], text: [number, number, number]) {
  doc.setFillColor(...fill);
  doc.setDrawColor(...text);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
  doc.setTextColor(...text);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(label, x + 3, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + 3, y + 13);
  doc.setTextColor(0, 0, 0);
}

/** A colored section-header bar (e.g. "Loan History") spanning the content width. */
function drawSectionHeader(doc: any, text: string, x: number, y: number, w: number, fill: [number, number, number] = RGB_TEAL) {
  doc.setFillColor(...fill);
  doc.rect(x, y, w, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text, x + 3, y + 5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

function statusColors(status: string): { fill: [number, number, number]; text: [number, number, number] } {
  if (status === 'Overdue') return { fill: RGB_RED_LIGHT, text: RGB_RED };
  if (status === 'Active Debt') return { fill: RGB_AMBER_LIGHT, text: RGB_AMBER };
  return { fill: RGB_GREEN_LIGHT, text: RGB_GREEN };
}

/** Truncates text with an ellipsis so it fits maxWidth, using jsPDF's actual measured
 *  text width for the current font — not an estimate — so this is reliable regardless
 *  of font/size or how long the real name/code turns out to be. */
function fitTextWidth(doc: any, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(truncated + '...') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trimEnd() + '...';
}

const SUMMARY_HEAD = ['Member ID', 'Name', 'Loan Amount', 'Paid', 'Remaining Balance', 'Status'];
const SUMMARY_STATUS_COL = 5; // index of the Status column within SUMMARY_HEAD

function summaryRow(r: any) {
  return [r.borrower_code, r.full_name, `Tk ${money(r.total_borrowed)}`, `Tk ${money(r.total_paid)}`, `Tk ${money(r.outstanding_balance)}`, r.credit_status];
}

function statusCellColorer(colIndex: number) {
  return (data: any) => {
    if (data.section === 'body' && data.column.index === colIndex) {
      const sc = statusColors(String(data.cell.raw));
      data.cell.styles.fillColor = sc.fill;
      data.cell.styles.textColor = sc.text;
      data.cell.styles.fontStyle = 'bold';
      data.cell.styles.halign = 'center';
    }
  };
}

/** Single member report — summary row, plus every individual payment with a running total. */
export async function buildSingleUserPdfBlob(borrower: any, payments: any[] = []): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  drawPageBorder(doc);
  drawBanner(doc, 'Member Credit / Debt Report', `Generated: ${new Date().toLocaleString()}  •  ${borrower.full_name}`);

  const boxW = 58, gap = 6, boxY = 32, boxH = 16;
  drawStatBox(doc, X, boxY, boxW, boxH, 'TOTAL BORROWED', `Tk ${money(borrower.total_borrowed)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + boxW + gap, boxY, boxW, boxH, 'TOTAL PAID', `Tk ${money(borrower.total_paid)}`, RGB_GREEN_LIGHT, RGB_GREEN);
  drawStatBox(doc, X + (boxW + gap) * 2, boxY, boxW, boxH, 'OUTSTANDING', `Tk ${money(borrower.outstanding_balance)}`, RGB_RED_LIGHT, RGB_RED);

  let y = boxY + boxH + 8;
  drawSectionHeader(doc, 'Member Summary', X, y, W, RGB_NAVY);
  autoTable(doc, {
    startY: y + 7,
    head: [SUMMARY_HEAD],
    body: [summaryRow(borrower)],
    headStyles: { fillColor: RGB_NAVY },
    styles: { fontSize: 8 },
    margin: { left: X, right: X },
    didParseCell: statusCellColorer(SUMMARY_STATUS_COL),
    didDrawPage: () => drawPageBorder(doc),
  });

  // Payment history — every individual payment, oldest first, with a running total and
  // remaining balance, so several installments paid toward the same loan are tracked
  // separately, not just shown as one lump sum.
  y = (doc as any).lastAutoTable.finalY + 8;
  drawSectionHeader(doc, 'Payment History', X, y, W, RGB_TEAL);
  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  const totalOwed = Number(borrower.outstanding_balance) + Number(borrower.total_paid);
  let running = 0;
  const payBody = ordered.map((p, i) => {
    running += Number(p.amount_paid);
    const remaining = totalOwed - running;
    return [String(i + 1), p.receipt_no, p.notes || 'Payment', new Date(p.payment_date).toLocaleDateString(), `Tk ${money(p.amount_paid)}`, `Tk ${money(running)}`, `Tk ${money(remaining)}`];
  });
  if (payBody.length === 0) payBody.push(['', 'No payments recorded.', '', '', '', '', '']);
  else payBody.push(['', '', '', '', 'TOTAL PAID', `Tk ${money(running)}`, `Tk ${money(totalOwed - running)}`]);

  autoTable(doc, {
    startY: y + 7,
    head: [['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid', 'Running Total', 'Remaining Balance']],
    body: payBody,
    headStyles: { fillColor: RGB_TEAL },
    styles: { fontSize: 7.5 },
    margin: { left: X, right: X },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === payBody.length - 1 && payments.length > 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = RGB_TEAL_LIGHT;
      }
    },
    didDrawPage: () => {
      drawPageBorder(doc);
      drawFooter(doc, [
        ['Total Borrowed', `Tk ${money(borrower.total_borrowed)}`],
        ['Total Paid', `Tk ${money(borrower.total_paid)}`],
        ['Outstanding', `Tk ${money(borrower.outstanding_balance)}`],
      ]);
    },
  });
  drawFooter(doc, [
    ['Total Borrowed', `Tk ${money(borrower.total_borrowed)}`],
    ['Total Paid', `Tk ${money(borrower.total_paid)}`],
    ['Outstanding', `Tk ${money(borrower.outstanding_balance)}`],
  ]);

  return doc.output('blob');
}

/** All members report — one page: banner, totals, and a summary table (one row per member). */
export async function buildAllUsersPdfBlob(rows: any[]): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  const totalBorrowed = rows.reduce((s, r) => s + Number(r.total_borrowed), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid), 0);
  const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding_balance), 0);

  drawPageBorder(doc);
  drawBanner(doc, 'All Members - Full Credit Report', `Generated: ${new Date().toLocaleString()}  •  ${rows.length} member(s)`);

  const boxW = 58, gap = 6, boxY = 32, boxH = 16;
  drawStatBox(doc, X, boxY, boxW, boxH, 'TOTAL BORROWED', `Tk ${money(totalBorrowed)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + boxW + gap, boxY, boxW, boxH, 'TOTAL PAID', `Tk ${money(totalPaid)}`, RGB_GREEN_LIGHT, RGB_GREEN);
  drawStatBox(doc, X + (boxW + gap) * 2, boxY, boxW, boxH, 'TOTAL OUTSTANDING', `Tk ${money(totalOutstanding)}`, RGB_RED_LIGHT, RGB_RED);

  const y = boxY + boxH + 8;
  drawSectionHeader(doc, 'All Members Summary', X, y, W, RGB_GOLD);
  autoTable(doc, {
    startY: y + 7,
    head: [SUMMARY_HEAD],
    body: rows.map((r) => summaryRow(r)),
    headStyles: { fillColor: RGB_GOLD },
    styles: { fontSize: 8 },
    margin: { left: X, right: X },
    didParseCell: statusCellColorer(SUMMARY_STATUS_COL),
    didDrawPage: () => {
      drawPageBorder(doc);
      drawFooter(doc, [
        ['Total Borrowed', `Tk ${money(totalBorrowed)}`],
        ['Total Paid', `Tk ${money(totalPaid)}`],
        ['Total Outstanding', `Tk ${money(totalOutstanding)}`],
      ]);
    },
  });
  drawFooter(doc, [
    ['Total Borrowed', `Tk ${money(totalBorrowed)}`],
    ['Total Paid', `Tk ${money(totalPaid)}`],
    ['Total Outstanding', `Tk ${money(totalOutstanding)}`],
  ]);

  return doc.output('blob');
}

export async function buildReceiptPdfBlob(receipt: any): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  // Outer border around the whole receipt
  doc.setDrawColor(15, 42, 63);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, 186, 190);
  doc.setLineWidth(0.2);
  doc.rect(14, 14, 182, 186);

  doc.setFontSize(18);
  doc.text('MicroLoan Admin', 105, 26, { align: 'center' });
  doc.setFontSize(11);
  doc.text('Payment Receipt', 105, 33, { align: 'center' });
  doc.line(20, 38, 190, 38);

  const rows = [
    ['Receipt No.', receipt.receipt_no],
    ['Date', new Date(receipt.payment_date).toLocaleDateString()],
    ['Member', `${receipt.full_name} (${receipt.borrower_code})`],
    ['Phone', receipt.phone || '-'],
    ['Loan Code', receipt.loan_code],
    ['Payment Method', receipt.payment_method.replace('_', ' ')],
  ];
  if (receipt.notes) rows.push(['Notes', receipt.notes]);

  autoTable(doc, {
    startY: 44,
    body: rows,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    margin: { left: 20, right: 20 },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(230, 246, 245);
  doc.rect(20, afterTable, 170, 16, 'F');
  doc.setDrawColor(20, 149, 143);
  doc.setLineWidth(0.3);
  doc.rect(20, afterTable, 170, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid', 25, afterTable + 10);
  doc.setFontSize(14);
  doc.text(`Tk ${money(receipt.amount_paid)}`, 185, afterTable + 10, { align: 'right' });

  return doc.output('blob');
}

// =====================================================================
// Excel exports — built with ExcelJS (not the plain `xlsx` package, which
// silently drops all cell styling on write).
// =====================================================================

const BRAND_NAVY = 'FF0F2A3F';
const BRAND_TEAL = 'FF14958F';
const LIGHT_FILL = 'FFF4F8F8';
const MONEY_FMT = '#,##0.00';

const STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  Clear: { fg: 'FF166534', bg: 'FFDCFCE7' },
  'Active Debt': { fg: 'FF92400E', bg: 'FFFEF3C7' },
  Overdue: { fg: 'FFB91C1C', bg: 'FFFEE2E2' },
};

function titleRow(ws: any, text: string, span: number) {
  ws.mergeCells(1, 1, 1, span);
  const cell = ws.getCell(1, 1);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_NAVY } };
  cell.alignment = { horizontal: 'left' };
  ws.getRow(1).height = 22;
}

function subtitleRow(ws: any, rowNum: number, text: string, span: number) {
  ws.mergeCells(rowNum, 1, rowNum, span);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF6B7C85' } };
}

function styleHeaderRow(row: any) {
  row.eachCell((cell: any) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_NAVY } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { top: { style: 'thin', color: { argb: 'FFD0D7DC' } }, bottom: { style: 'thin', color: { argb: 'FFD0D7DC' } } };
  });
  row.height = 20;
}

function styleDataRow(row: any, striped: boolean) {
  row.eachCell((cell: any) => {
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFEDF1F3' } } };
    if (striped) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_FILL } };
  });
}

function applyStatusBadge(cell: any, status: string) {
  const c = STATUS_COLORS[status];
  cell.value = status;
  if (c) {
    cell.font = { bold: true, color: { argb: c.fg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.bg } };
    cell.alignment = { horizontal: 'center' };
  }
}

function autoWidth(ws: any, colCount: number, minWidths: number[] = [], startRow = 1) {
  for (let i = 1; i <= colCount; i++) {
    const col = ws.getColumn(i);
    let max = minWidths[i - 1] || 10;
    col.eachCell({ includeEmpty: false }, (cell: any) => {
      if (cell.row < startRow) return;
      const len = cell.value instanceof Date ? 10 : String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 3, 45);
  }
}

const EXCEL_HEADERS = ['Member ID', 'Name', 'Loan Amount (BDT)', 'Paid (BDT)', 'Remaining Balance (BDT)', 'Status'];

/** All members report — a single sheet, one row per member. */
export async function buildAllUsersExcelBlob(rows: any[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' },
  });
  titleRow(summary, 'MicroLoan Admin — All Members Credit Report', EXCEL_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}  •  ${rows.length} member(s)`, EXCEL_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_HEADERS);
  styleHeaderRow(headerRow);

  let totalBorrowed = 0, totalPaid = 0, totalOutstanding = 0;
  rows.forEach((r, i) => {
    const row = summary.addRow([r.borrower_code, r.full_name, Number(r.total_borrowed), Number(r.total_paid), Number(r.outstanding_balance), '']);
    styleDataRow(row, i % 2 === 1);
    row.getCell(3).numFmt = MONEY_FMT;
    row.getCell(4).numFmt = MONEY_FMT;
    row.getCell(5).numFmt = MONEY_FMT;
    applyStatusBadge(row.getCell(6), r.credit_status);
    totalBorrowed += Number(r.total_borrowed);
    totalPaid += Number(r.total_paid);
    totalOutstanding += Number(r.outstanding_balance);
  });

  const totalRow = summary.addRow(['', 'TOTAL', totalBorrowed, totalPaid, totalOutstanding, '']);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(3).numFmt = MONEY_FMT;
  totalRow.getCell(4).numFmt = MONEY_FMT;
  totalRow.getCell(5).numFmt = MONEY_FMT;

  autoWidth(summary, EXCEL_HEADERS.length, [12, 22, 16, 14, 18, 14], 4);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Single member report — summary sheet, plus a Payments sheet with running total. */
export async function buildSingleUserExcelBlob(borrower: any, payments: any[] = []): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' } });
  titleRow(summary, 'Member Credit / Debt Report', EXCEL_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}`, EXCEL_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_HEADERS);
  styleHeaderRow(headerRow);

  const row = summary.addRow([borrower.borrower_code, borrower.full_name, Number(borrower.total_borrowed), Number(borrower.total_paid), Number(borrower.outstanding_balance), '']);
  styleDataRow(row, false);
  row.getCell(3).numFmt = MONEY_FMT;
  row.getCell(4).numFmt = MONEY_FMT;
  row.getCell(5).numFmt = MONEY_FMT;
  applyStatusBadge(row.getCell(6), borrower.credit_status);

  autoWidth(summary, EXCEL_HEADERS.length, [12, 22, 16, 14, 18, 14], 4);

  // Payments sheet — every individual payment, oldest first, with a running total.
  const paySheet = wb.addWorksheet('Payments', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const payHeaders = ['SL', 'Receipt No.', 'Date', 'Amount Paid (BDT)', 'Running Total (BDT)'];
  const payHeaderRow = paySheet.addRow(payHeaders);
  styleHeaderRow(payHeaderRow);

  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  let running = 0;
  ordered.forEach((p, i) => {
    running += Number(p.amount_paid);
    const r = paySheet.addRow([i + 1, p.receipt_no, new Date(p.payment_date), Number(p.amount_paid), running]);
    styleDataRow(r, i % 2 === 1);
    r.getCell(3).numFmt = 'yyyy-mm-dd';
    r.getCell(4).numFmt = MONEY_FMT;
    r.getCell(5).numFmt = MONEY_FMT;
  });

  if (ordered.length === 0) {
    paySheet.addRow(['', 'No payments recorded.', '', '', '']);
  } else {
    const totalRow = paySheet.addRow(['', '', '', 'TOTAL PAID', running]);
    totalRow.eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
      cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
    });
    totalRow.getCell(5).numFmt = MONEY_FMT;
  }

  autoWidth(paySheet, 5, [6, 22, 14, 16, 18]);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function buildReceiptExcelBlob(receipt: any): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const ws = wb.addWorksheet('Receipt', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  titleRow(ws, 'MicroLoan Admin — Payment Receipt', 2);
  ws.addRow([]);

  const fields: [string, any][] = [
    ['Receipt No.', receipt.receipt_no],
    ['Date', new Date(receipt.payment_date)],
    ['Member', receipt.full_name],
    ['Member Code', receipt.borrower_code],
    ['Phone', receipt.phone || ''],
    ['Loan Code', receipt.loan_code],
    ['Payment Method', receipt.payment_method.replace('_', ' ')],
  ];
  if (receipt.notes) fields.push(['Notes', receipt.notes]);

  for (const [label, value] of fields) {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: BRAND_NAVY } };
    if (value instanceof Date) {
      row.getCell(2).numFmt = 'yyyy-mm-dd';
      row.getCell(2).alignment = { horizontal: 'left' };
    }
  }

  ws.addRow([]);
  const amountRow = ws.addRow(['Amount Paid (BDT)', Number(receipt.amount_paid)]);
  amountRow.eachCell((cell: any) => {
    cell.font = { bold: true, size: 12, color: { argb: BRAND_NAVY } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
  });
  amountRow.getCell(2).numFmt = MONEY_FMT;

  autoWidth(ws, 2, [20, 32], 3);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
