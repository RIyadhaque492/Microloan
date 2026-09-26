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
const RGB_BLACK: [number, number, number] = [0, 0, 0];

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
  doc.text(fitTextWidth(doc, value, w - 5), x + 3, y + 13);
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

function fmtDate(d: any): string {
  if (!d) return '—';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString();
}

// =====================================================================
// Unified loan-register columns — used by BOTH the Single Member and All
// Members reports (one row per disbursed LOAN, not per member): Opening
// (disbursement date), SL, Name, Member ID, Loan Amount, Total Payable
// Amount, Installment Amount, Installment Quantity, Total Paid Amount,
// Remaining Balance, Maturity Date, Contact Number.
// =====================================================================

const LOAN_REPORT_HEAD = [
  'SL', 'Opening', 'Name', 'Member ID', 'Loan Amount', 'Total Payable',
  'Installment Amt', 'Qty', 'Total Paid', 'Remaining Balance', 'Maturity Date', 'Contact',
];

const LOAN_REPORT_COL_STYLES: Record<number, any> = {
  0: { cellWidth: 8, halign: 'center' },
  1: { cellWidth: 16 },
  2: { cellWidth: 26 },
  3: { cellWidth: 14 },
  4: { cellWidth: 16 },
  5: { cellWidth: 18 },
  6: { cellWidth: 14 },
  7: { cellWidth: 8, halign: 'center' },
  8: { cellWidth: 16 },
  9: { cellWidth: 16 },
  10: { cellWidth: 16 },
  11: { cellWidth: 18 },
};

function loanReportRow(r: any, sl: number): string[] {
  return [
    String(sl),
    fmtDate(r.disbursement_date),
    r.full_name,
    r.borrower_code,
    `Tk ${money(r.loan_amount)}`,
    `Tk ${money(r.total_payable)}`,
    `Tk ${money(r.installment_amount)}`,
    String(r.tenure),
    `Tk ${money(r.total_paid)}`,
    `Tk ${money(r.remaining_balance)}`,
    fmtDate(r.maturity_date),
    r.phone || '—',
  ];
}

function loanReportTotals(rows: any[]) {
  return {
    loanAmount: rows.reduce((s, r) => s + Number(r.loan_amount), 0),
    totalPayable: rows.reduce((s, r) => s + Number(r.total_payable), 0),
    totalPaid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
    remaining: rows.reduce((s, r) => s + Number(r.remaining_balance), 0),
  };
}

/** Single member report — a loan-register table (one row per disbursed loan for this
 *  member) plus every individual payment across all of that member's loans. */
export async function buildSingleUserPdfBlob(member: any, loanRows: any[] = [], payments: any[] = []): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  const totals = loanReportTotals(loanRows);

  drawPageBorder(doc);
  drawBanner(doc, 'Member Credit / Debt Report', `Generated: ${new Date().toLocaleString()}  •  ${member.full_name} (${member.borrower_code})`);

  const boxW = 42, gap = 6, boxY = 32, boxH = 16;
  drawStatBox(doc, X, boxY, boxW, boxH, 'LOAN AMOUNT', `Tk ${money(totals.loanAmount)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + (boxW + gap), boxY, boxW, boxH, 'TOTAL PAYABLE', `Tk ${money(totals.totalPayable)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + (boxW + gap) * 2, boxY, boxW, boxH, 'TOTAL PAID', `Tk ${money(totals.totalPaid)}`, RGB_GREEN_LIGHT, RGB_GREEN);
  drawStatBox(doc, X + (boxW + gap) * 3, boxY, boxW, boxH, 'REMAINING', `Tk ${money(totals.remaining)}`, RGB_RED_LIGHT, RGB_RED);

  let y = boxY + boxH + 8;
  drawSectionHeader(doc, 'Loan Register', X, y, W, RGB_NAVY);
  autoTable(doc, {
    startY: y + 7,
    head: [LOAN_REPORT_HEAD],
    body: loanRows.length ? loanRows.map((r, i) => loanReportRow(r, i + 1)) : [['—', 'No disbursed loans.', '', '', '', '', '', '', '', '', '', '']],
    headStyles: { fillColor: RGB_NAVY, fontSize: 6.5 },
    styles: { fontSize: 6.5 },
    columnStyles: LOAN_REPORT_COL_STYLES,
    margin: { left: X, right: X },
    didDrawPage: () => drawPageBorder(doc),
  });

  // Payment history — every individual payment across all of this member's loans,
  // oldest first, with a remaining-balance column (no running-total column).
  y = (doc as any).lastAutoTable.finalY + 8;
  drawSectionHeader(doc, 'Payment History', X, y, W, RGB_TEAL);
  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  let running = 0;
  const payBody = ordered.map((p, i) => {
    running += Number(p.amount_paid);
    const remaining = Math.max(0, totals.totalPayable - running);
    return [String(i + 1), p.receipt_no, p.notes || 'Installment', fmtDate(p.payment_date), `Tk ${money(p.amount_paid)}`, `Tk ${money(remaining)}`];
  });
  if (payBody.length === 0) payBody.push(['', 'No payments recorded.', '', '', '', '']);
  else payBody.push(['', '', '', '', 'TOTAL PAID', `Tk ${money(running)}`]);

  autoTable(doc, {
    startY: y + 7,
    head: [['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid', 'Remaining Balance']],
    body: payBody,
    theme: 'grid',
    headStyles: { fillColor: RGB_TEAL, lineColor: RGB_BLACK, lineWidth: 0.3 },
    styles: { fontSize: 7.5, lineColor: RGB_BLACK, lineWidth: 0.3 },
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
        ['Loan Amount', `Tk ${money(totals.loanAmount)}`],
        ['Total Payable', `Tk ${money(totals.totalPayable)}`],
        ['Total Paid', `Tk ${money(totals.totalPaid)}`],
        ['Remaining', `Tk ${money(totals.remaining)}`],
      ]);
    },
  });
  drawFooter(doc, [
    ['Loan Amount', `Tk ${money(totals.loanAmount)}`],
    ['Total Payable', `Tk ${money(totals.totalPayable)}`],
    ['Total Paid', `Tk ${money(totals.totalPaid)}`],
    ['Remaining', `Tk ${money(totals.remaining)}`],
  ]);

  return doc.output('blob');
}

/** All members report — a loan-register table with one row PER LOAN across every
 *  member (a member with two disbursed loans appears twice), with grand totals. */
export async function buildAllUsersPdfBlob(loanRows: any[]): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  const totals = loanReportTotals(loanRows);

  drawPageBorder(doc);
  drawBanner(doc, 'All Loans - Full Register', `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`);

  const boxW = 42, gap = 6, boxY = 32, boxH = 16;
  drawStatBox(doc, X, boxY, boxW, boxH, 'TOTAL LOAN AMOUNT', `Tk ${money(totals.loanAmount)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + (boxW + gap), boxY, boxW, boxH, 'TOTAL PAYABLE', `Tk ${money(totals.totalPayable)}`, [224, 231, 241], RGB_NAVY);
  drawStatBox(doc, X + (boxW + gap) * 2, boxY, boxW, boxH, 'TOTAL PAID', `Tk ${money(totals.totalPaid)}`, RGB_GREEN_LIGHT, RGB_GREEN);
  drawStatBox(doc, X + (boxW + gap) * 3, boxY, boxW, boxH, 'TOTAL REMAINING', `Tk ${money(totals.remaining)}`, RGB_RED_LIGHT, RGB_RED);

  const y = boxY + boxH + 8;
  drawSectionHeader(doc, 'All Loans Register', X, y, W, RGB_GOLD);

  const bodyRows = loanRows.length ? loanRows.map((r, i) => loanReportRow(r, i + 1)) : [['—', 'No disbursed loans.', '', '', '', '', '', '', '', '', '', '']];
  const footFigures: [string, string][] = [
    ['Total Loan', `Tk ${money(totals.loanAmount)}`],
    ['Total Payable', `Tk ${money(totals.totalPayable)}`],
    ['Total Paid', `Tk ${money(totals.totalPaid)}`],
    ['Remaining', `Tk ${money(totals.remaining)}`],
  ];

  autoTable(doc, {
    startY: y + 7,
    head: [LOAN_REPORT_HEAD],
    body: bodyRows,
    foot: loanRows.length ? [['', '', '', 'TOTAL', `Tk ${money(totals.loanAmount)}`, `Tk ${money(totals.totalPayable)}`, '', '', `Tk ${money(totals.totalPaid)}`, `Tk ${money(totals.remaining)}`, '', '']] : undefined,
    headStyles: { fillColor: RGB_GOLD, fontSize: 6.5 },
    footStyles: { fillColor: [244, 248, 248], textColor: RGB_NAVY, fontStyle: 'bold', fontSize: 6.5 },
    styles: { fontSize: 6.5 },
    columnStyles: LOAN_REPORT_COL_STYLES,
    margin: { left: X, right: X, bottom: 24 },
    // The bottom-total footer bar is drawn on EVERY page (not just the last), so a
    // multi-page loan register never loses its running grand totals off the bottom
    // of a page — this is the fix for the previously "missing" totals bar.
    didDrawPage: () => {
      drawPageBorder(doc);
      drawFooter(doc, footFigures);
    },
  });
  drawFooter(doc, footFigures);

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
    ['Particulars', receipt.notes || 'Installment'],
    ['Payment Method', receipt.payment_method.replace('_', ' ')],
  ];

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
const BLACK_BORDER = { style: 'thin', color: { argb: 'FF000000' } };

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

/** Applies a full black grid border to every cell in the row — used for the Payment
 *  History sheet on the single-member report, per the "black border" requirement. */
function styleDataRowBlackBorder(row: any) {
  row.eachCell((cell: any) => {
    cell.border = { top: BLACK_BORDER, bottom: BLACK_BORDER, left: BLACK_BORDER, right: BLACK_BORDER };
  });
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

const EXCEL_LOAN_HEADERS = [
  'SL', 'Opening', 'Name', 'Member ID', 'Loan Amount (BDT)', 'Total Payable (BDT)',
  'Installment Amt (BDT)', 'Qty', 'Total Paid (BDT)', 'Remaining Balance (BDT)', 'Maturity Date', 'Contact',
];
const EXCEL_LOAN_COL_WIDTHS = [6, 12, 22, 12, 16, 16, 16, 6, 16, 18, 12, 16];

function addLoanReportRow(ws: any, r: any, sl: number, striped: boolean) {
  const row = ws.addRow([
    sl,
    r.disbursement_date ? new Date(r.disbursement_date) : null,
    r.full_name,
    r.borrower_code,
    Number(r.loan_amount),
    Number(r.total_payable),
    Number(r.installment_amount),
    Number(r.tenure),
    Number(r.total_paid),
    Number(r.remaining_balance),
    r.maturity_date ? new Date(r.maturity_date) : null,
    r.phone || '',
  ]);
  styleDataRow(row, striped);
  row.getCell(2).numFmt = 'yyyy-mm-dd';
  row.getCell(5).numFmt = MONEY_FMT;
  row.getCell(6).numFmt = MONEY_FMT;
  row.getCell(7).numFmt = MONEY_FMT;
  row.getCell(9).numFmt = MONEY_FMT;
  row.getCell(10).numFmt = MONEY_FMT;
  row.getCell(11).numFmt = 'yyyy-mm-dd';
  return row;
}

/** All members report — a single sheet, one row PER LOAN across every member. */
export async function buildAllUsersExcelBlob(loanRows: any[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Loan Register', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' },
  });
  titleRow(summary, 'MicroLoan Admin — All Loans Register', EXCEL_LOAN_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`, EXCEL_LOAN_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_LOAN_HEADERS);
  styleHeaderRow(headerRow);

  loanRows.forEach((r, i) => addLoanReportRow(summary, r, i + 1, i % 2 === 1));

  const totals = loanReportTotals(loanRows);
  const totalRow = summary.addRow(['', '', 'TOTAL', '', totals.loanAmount, totals.totalPayable, '', '', totals.totalPaid, totals.remaining, '', '']);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(5).numFmt = MONEY_FMT;
  totalRow.getCell(6).numFmt = MONEY_FMT;
  totalRow.getCell(9).numFmt = MONEY_FMT;
  totalRow.getCell(10).numFmt = MONEY_FMT;

  autoWidth(summary, EXCEL_LOAN_HEADERS.length, EXCEL_LOAN_COL_WIDTHS, 4);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Single member report — loan-register sheet, plus a Payments sheet (black-bordered,
 *  no running-total column) with a remaining-balance column instead. */
export async function buildSingleUserExcelBlob(member: any, loanRows: any[] = [], payments: any[] = []): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Loan Register', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' } });
  titleRow(summary, `Member Credit / Debt Report — ${member.full_name} (${member.borrower_code})`, EXCEL_LOAN_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}`, EXCEL_LOAN_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_LOAN_HEADERS);
  styleHeaderRow(headerRow);

  loanRows.forEach((r, i) => addLoanReportRow(summary, r, i + 1, i % 2 === 1));

  const totals = loanReportTotals(loanRows);
  const totalRow = summary.addRow(['', '', 'TOTAL', '', totals.loanAmount, totals.totalPayable, '', '', totals.totalPaid, totals.remaining, '', '']);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(5).numFmt = MONEY_FMT;
  totalRow.getCell(6).numFmt = MONEY_FMT;
  totalRow.getCell(9).numFmt = MONEY_FMT;
  totalRow.getCell(10).numFmt = MONEY_FMT;

  autoWidth(summary, EXCEL_LOAN_HEADERS.length, EXCEL_LOAN_COL_WIDTHS, 4);

  // Payments sheet — every individual payment, oldest first, with a black border and
  // a remaining-balance column (no running-total column).
  const paySheet = wb.addWorksheet('Payments', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const payHeaders = ['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid (BDT)', 'Remaining Balance (BDT)'];
  const payHeaderRow = paySheet.addRow(payHeaders);
  styleHeaderRow(payHeaderRow);
  styleDataRowBlackBorder(payHeaderRow);

  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  let running = 0;
  ordered.forEach((p, i) => {
    running += Number(p.amount_paid);
    const remaining = Math.max(0, totals.totalPayable - running);
    const r = paySheet.addRow([i + 1, p.receipt_no, p.notes || 'Installment', new Date(p.payment_date), Number(p.amount_paid), remaining]);
    styleDataRow(r, i % 2 === 1);
    styleDataRowBlackBorder(r);
    r.getCell(4).numFmt = 'yyyy-mm-dd';
    r.getCell(5).numFmt = MONEY_FMT;
    r.getCell(6).numFmt = MONEY_FMT;
  });

  if (ordered.length === 0) {
    const r = paySheet.addRow(['', 'No payments recorded.', '', '', '', '']);
    styleDataRowBlackBorder(r);
  } else {
    const totalPayRow = paySheet.addRow(['', '', '', '', 'TOTAL PAID', running]);
    totalPayRow.eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    });
    styleDataRowBlackBorder(totalPayRow);
    totalPayRow.getCell(6).numFmt = MONEY_FMT;
  }

  autoWidth(paySheet, 6, [6, 14, 16, 14, 16, 18]);

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
    ['Particulars', receipt.notes || 'Installment'],
    ['Payment Method', receipt.payment_method.replace('_', ' ')],
  ];

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

// =====================================================================
// Word (.docx) exports — built with the `docx` package.
// =====================================================================

const DOCX_NAVY = '0F2A3F';
const DOCX_TEAL = '14958F';
const DOCX_GOLD = 'D99A2B';
const DOCX_LIGHT = 'F4F8F8';

function docxHeaderCell(Docx: any, text: string, fill: string) {
  return new Docx.TableCell({
    shading: { fill, type: Docx.ShadingType.CLEAR, color: 'auto' },
    children: [new Docx.Paragraph({ children: [new Docx.TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })] })],
  });
}

function docxCell(Docx: any, text: string, opts: { bold?: boolean; fill?: string; border?: boolean } = {}) {
  return new Docx.TableCell({
    shading: opts.fill ? { fill: opts.fill, type: Docx.ShadingType.CLEAR, color: 'auto' } : undefined,
    borders: opts.border
      ? {
          top: { style: Docx.BorderStyle.SINGLE, size: 4, color: '000000' },
          bottom: { style: Docx.BorderStyle.SINGLE, size: 4, color: '000000' },
          left: { style: Docx.BorderStyle.SINGLE, size: 4, color: '000000' },
          right: { style: Docx.BorderStyle.SINGLE, size: 4, color: '000000' },
        }
      : undefined,
    children: [new Docx.Paragraph({ children: [new Docx.TextRun({ text, bold: !!opts.bold, size: 16 })] })],
  });
}

function docxSummaryTable(Docx: any, headers: string[], rows: string[][], headFill: string, blackBorder = false) {
  return new Docx.Table({
    width: { size: 100, type: Docx.WidthType.PERCENTAGE },
    rows: [
      new Docx.TableRow({ children: headers.map((h) => docxHeaderCell(Docx, h, headFill)) }),
      ...rows.map((r, i) => new Docx.TableRow({ children: r.map((c) => docxCell(Docx, c, { fill: i % 2 === 1 ? DOCX_LIGHT : undefined, border: blackBorder })) })),
    ],
  });
}

/** Single member report as a Word document — loan-register table + full payment history. */
export async function buildSingleUserWordBlob(member: any, loanRows: any[] = [], payments: any[] = []): Promise<Blob> {
  const Docx = await import('docx');

  const totals = loanReportTotals(loanRows);
  const loanTableRows = loanRows.length ? loanRows.map((r, i) => loanReportRow(r, i + 1)) : [['—', 'No disbursed loans.', '', '', '', '', '', '', '', '', '', '']];

  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  let running = 0;
  const payRows = ordered.map((p, i) => {
    running += Number(p.amount_paid);
    const remaining = Math.max(0, totals.totalPayable - running);
    return [String(i + 1), p.receipt_no, p.notes || 'Installment', fmtDate(p.payment_date), `Tk ${money(p.amount_paid)}`, `Tk ${money(remaining)}`];
  });
  if (payRows.length === 0) payRows.push(['', 'No payments recorded.', '', '', '', '']);
  else payRows.push(['', '', '', '', 'TOTAL PAID', `Tk ${money(running)}`]);

  const doc = new Docx.Document({
    sections: [
      {
        children: [
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Member Credit / Debt Report', bold: true, size: 32, color: DOCX_NAVY })] }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: `Generated: ${new Date().toLocaleString()}  •  ${member.full_name} (${member.borrower_code})`, italics: true, size: 18, color: '6B7C85' })] }),
          new Docx.Paragraph({ text: '' }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Loan Register', bold: true, size: 22, color: DOCX_NAVY })] }),
          docxSummaryTable(Docx, LOAN_REPORT_HEAD, loanTableRows, DOCX_NAVY),
          new Docx.Paragraph({ text: '' }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Payment History', bold: true, size: 22, color: DOCX_TEAL })] }),
          docxSummaryTable(Docx, ['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid', 'Remaining Balance'], payRows, DOCX_TEAL, true),
          new Docx.Paragraph({ text: '' }),
          new Docx.Paragraph({
            children: [
              new Docx.TextRun({ text: `Loan Amount: Tk ${money(totals.loanAmount)}   `, bold: true }),
              new Docx.TextRun({ text: `Total Payable: Tk ${money(totals.totalPayable)}   `, bold: true }),
              new Docx.TextRun({ text: `Total Paid: Tk ${money(totals.totalPaid)}   `, bold: true }),
              new Docx.TextRun({ text: `Remaining: Tk ${money(totals.remaining)}`, bold: true }),
            ],
          }),
        ],
      },
    ],
  });

  const buf = await Docx.Packer.toBlob(doc);
  return buf;
}

/** All members report as a Word document — one loan-register table, one row per loan. */
export async function buildAllUsersWordBlob(loanRows: any[]): Promise<Blob> {
  const Docx = await import('docx');

  const totals = loanReportTotals(loanRows);
  const loanTableRows = loanRows.length ? loanRows.map((r, i) => loanReportRow(r, i + 1)) : [['—', 'No disbursed loans.', '', '', '', '', '', '', '', '', '', '']];

  const doc = new Docx.Document({
    sections: [
      {
        children: [
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'All Loans - Full Register', bold: true, size: 32, color: DOCX_NAVY })] }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`, italics: true, size: 18, color: '6B7C85' })] }),
          new Docx.Paragraph({ text: '' }),
          docxSummaryTable(Docx, LOAN_REPORT_HEAD, loanTableRows, DOCX_GOLD),
          new Docx.Paragraph({ text: '' }),
          new Docx.Paragraph({
            children: [
              new Docx.TextRun({ text: `Total Loan Amount: Tk ${money(totals.loanAmount)}   `, bold: true }),
              new Docx.TextRun({ text: `Total Payable: Tk ${money(totals.totalPayable)}   `, bold: true }),
              new Docx.TextRun({ text: `Total Paid: Tk ${money(totals.totalPaid)}   `, bold: true }),
              new Docx.TextRun({ text: `Total Remaining: Tk ${money(totals.remaining)}`, bold: true }),
            ],
          }),
        ],
      },
    ],
  });

  const buf = await Docx.Packer.toBlob(doc);
  return buf;
}
