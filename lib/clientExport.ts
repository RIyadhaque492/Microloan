import { money } from './utils';

/**
 * Shares a file via the native share sheet if the browser/OS supports sharing
 * files (most mobile browsers do — this lets the user pick WhatsApp, Messenger,
 * email, etc. with the actual file attached). Falls back to a plain download
 * everywhere else (desktop browsers mostly).
 */
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

function loanRow(l: any) {
  return [l.loan_code, `Tk ${money(l.loan_amount)}`, `${l.tenure} ${l.repayment_frequency}`, `Tk ${money(l.total_payable)}`, l.status];
}
function paymentRow(p: any) {
  return [p.receipt_no, p.loan_code, new Date(p.payment_date).toLocaleDateString(), `Tk ${money(p.amount_paid)}`, p.payment_method];
}

export async function buildSingleUserPdfBlob(borrower: any, loans: any[], payments: any[]): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Borrower Credit / Debt Report', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);

  doc.setFontSize(12);
  doc.text(`${borrower.full_name} (${borrower.borrower_code})`, 14, 30);
  doc.setFontSize(10);
  doc.text(`Phone: ${borrower.phone}`, 14, 36);
  doc.text(`Total Borrowed: Tk ${money(borrower.total_borrowed)}   Total Paid: Tk ${money(borrower.total_paid)}   Outstanding: Tk ${money(borrower.outstanding_balance)}`, 14, 42);

  autoTable(doc, {
    startY: 50,
    head: [['Loan Code', 'Amount', 'Tenure', 'Total Payable', 'Status']],
    body: loans.length ? loans.map(loanRow) : [['No loans on record.', '', '', '', '']],
    headStyles: { fillColor: [15, 42, 63] },
    styles: { fontSize: 8 },
  });

  const afterLoans = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text('Payment History', 14, afterLoans);

  autoTable(doc, {
    startY: afterLoans + 4,
    head: [['Receipt No.', 'Loan Code', 'Date', 'Amount Paid', 'Method']],
    body: payments.length ? payments.map(paymentRow) : [['No payments recorded.', '', '', '', '']],
    headStyles: { fillColor: [15, 42, 63] },
    styles: { fontSize: 8 },
  });

  return doc.output('blob');
}

export async function buildAllUsersPdfBlob(rows: any[]): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('All Borrowers - Full Credit Report', 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);

  autoTable(doc, {
    startY: 27,
    head: [['Code', 'Name', 'Phone', 'Borrowed', 'Paid', 'Outstanding', 'Status']],
    body: rows.map((r) => [r.borrower_code, r.full_name, r.phone, `Tk ${money(r.total_borrowed)}`, `Tk ${money(r.total_paid)}`, `Tk ${money(r.outstanding_balance)}`, r.credit_status]),
    headStyles: { fillColor: [15, 42, 63] },
    styles: { fontSize: 8 },
  });

  for (const r of rows) {
    doc.addPage();
    doc.setFontSize(13);
    doc.text(`${r.full_name} (${r.borrower_code})`, 14, 18);
    doc.setFontSize(9);
    doc.text(`${r.phone}  |  Borrowed: Tk ${money(r.total_borrowed)}  Paid: Tk ${money(r.total_paid)}  Outstanding: Tk ${money(r.outstanding_balance)}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [['Loan Code', 'Amount', 'Tenure', 'Total Payable', 'Status']],
      body: r.loans.length ? r.loans.map(loanRow) : [['No loans on record.', '', '', '', '']],
      headStyles: { fillColor: [20, 149, 143] },
      styles: { fontSize: 8 },
    });

    const afterLoans = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(10);
    doc.text('Payment History', 14, afterLoans);

    autoTable(doc, {
      startY: afterLoans + 3,
      head: [['Receipt No.', 'Loan Code', 'Date', 'Amount Paid', 'Method']],
      body: r.payments.length ? r.payments.map(paymentRow) : [['No payments recorded.', '', '', '', '']],
      headStyles: { fillColor: [20, 149, 143] },
      styles: { fontSize: 8 },
    });
  }

  return doc.output('blob');
}

export async function buildReceiptPdfBlob(receipt: any): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('MicroLoan Admin', 105, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.text('Payment Receipt', 105, 27, { align: 'center' });
  doc.setLineWidth(0.2);
  doc.line(20, 32, 190, 32);

  const rows = [
    ['Receipt No.', receipt.receipt_no],
    ['Date', new Date(receipt.payment_date).toLocaleDateString()],
    ['Borrower', `${receipt.full_name} (${receipt.borrower_code})`],
    ['Phone', receipt.phone || '-'],
    ['Loan Code', receipt.loan_code],
    ['Payment Method', receipt.payment_method.replace('_', ' ')],
  ];
  if (receipt.notes) rows.push(['Notes', receipt.notes]);

  autoTable(doc, {
    startY: 38,
    body: rows,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(230, 246, 245);
  doc.rect(20, afterTable, 170, 16, 'F');
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount Paid', 25, afterTable + 10);
  doc.setFontSize(14);
  doc.text(`Tk ${money(receipt.amount_paid)}`, 185, afterTable + 10, { align: 'right' });

  return doc.output('blob');
}

// =====================================================================
// Excel exports — built with ExcelJS (not the plain `xlsx` package, which
// silently drops all cell styling on write). Shared styling helpers below
// keep every export looking consistent and presentation-ready.
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
      if (cell.row < startRow) return; // skip merged title/subtitle rows — their text isn't this column's content
      // A Date's raw toString() is a long verbose string (e.g. "Sat Sep 12 2026 00:00:00 GMT...");
      // what actually displays is the numFmt-formatted value (e.g. "2026-09-12", 10 chars).
      const len = cell.value instanceof Date ? 10 : String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 3, 45);
  }
}

/** All Borrowers Report — a Summary sheet plus one detail sheet per borrower. */
export async function buildAllUsersExcelBlob(rows: any[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  // ---- Summary sheet ----
  const summary = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 4 }], pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' } });
  const headers = ['Borrower Code', 'Name', 'Phone', 'Loans', 'Borrowed (BDT)', 'Paid (BDT)', 'Outstanding (BDT)', 'Status'];
  titleRow(summary, 'MicroLoan Admin — All Borrowers Credit Report', headers.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}`, headers.length);
  summary.addRow([]);
  const headerRow = summary.addRow(headers);
  styleHeaderRow(headerRow);

  let totalBorrowed = 0, totalPaid = 0, totalOutstanding = 0;
  rows.forEach((r, i) => {
    const row = summary.addRow([r.borrower_code, r.full_name, r.phone, r.loans.length, Number(r.total_borrowed), Number(r.total_paid), Number(r.outstanding_balance), '']);
    styleDataRow(row, i % 2 === 1);
    row.getCell(5).numFmt = MONEY_FMT;
    row.getCell(6).numFmt = MONEY_FMT;
    row.getCell(7).numFmt = MONEY_FMT;
    applyStatusBadge(row.getCell(8), r.credit_status);
    totalBorrowed += Number(r.total_borrowed);
    totalPaid += Number(r.total_paid);
    totalOutstanding += Number(r.outstanding_balance);
  });

  const totalRow = summary.addRow(['', '', '', 'TOTAL', totalBorrowed, totalPaid, totalOutstanding, '']);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(5).numFmt = MONEY_FMT;
  totalRow.getCell(6).numFmt = MONEY_FMT;
  totalRow.getCell(7).numFmt = MONEY_FMT;

  autoWidth(summary, headers.length, [18, 22, 14, 7, 14, 14, 16, 12], 4);

  // ---- One detail sheet per borrower ----
  const used = new Set<string>(['Summary']);
  for (const r of rows) {
    const ws = wb.addWorksheet(safeSheetName(r.full_name, used), { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    titleRow(ws, `${r.full_name} (${r.borrower_code})`, 5);
    subtitleRow(ws, 2, `${r.phone}  •  Borrowed: Tk ${money(r.total_borrowed)}  •  Paid: Tk ${money(r.total_paid)}  •  Outstanding: Tk ${money(r.outstanding_balance)}`, 5);
    ws.addRow([]);

    const loanHeaderRow = ws.addRow(['Loan Code', 'Amount (BDT)', 'Tenure', 'Total Payable (BDT)', 'Status']);
    styleHeaderRow(loanHeaderRow);
    if (r.loans.length === 0) {
      ws.addRow(['No loans on record.', '', '', '', '']);
    } else {
      r.loans.forEach((l: any, i: number) => {
        const row = ws.addRow([l.loan_code, Number(l.loan_amount), `${l.tenure} ${l.repayment_frequency}`, Number(l.total_payable), l.status]);
        styleDataRow(row, i % 2 === 1);
        row.getCell(2).numFmt = MONEY_FMT;
        row.getCell(4).numFmt = MONEY_FMT;
      });
    }

    ws.addRow([]);
    const payTitleCell = ws.addRow(['Payment History']).getCell(1);
    payTitleCell.font = { bold: true, size: 11, color: { argb: BRAND_NAVY } };

    const payHeaderRow = ws.addRow(['Receipt No.', 'Loan Code', 'Date', 'Amount Paid (BDT)', 'Method']);
    styleHeaderRow(payHeaderRow);
    if (r.payments.length === 0) {
      ws.addRow(['No payments recorded.', '', '', '', '']);
    } else {
      r.payments.forEach((p: any, i: number) => {
        const row = ws.addRow([p.receipt_no, p.loan_code, new Date(p.payment_date), p.amount_paid !== undefined ? Number(p.amount_paid) : 0, p.payment_method]);
        styleDataRow(row, i % 2 === 1);
        row.getCell(3).numFmt = 'yyyy-mm-dd';
        row.getCell(4).numFmt = MONEY_FMT;
      });
    }

    autoWidth(ws, 5, [22, 16, 14, 18, 14], 4);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Single borrower report — Summary, Loans, and Payments as separate sheets. */
export async function buildSingleUserExcelBlob(borrower: any, loans: any[], payments: any[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Summary', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  titleRow(summary, 'Borrower Credit / Debt Report', 2);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}`, 2);
  summary.addRow([]);

  const fields: [string, any][] = [
    ['Name', borrower.full_name],
    ['Borrower Code', borrower.borrower_code],
    ['Phone', borrower.phone],
    ['Total Borrowed (BDT)', Number(borrower.total_borrowed)],
    ['Total Paid (BDT)', Number(borrower.total_paid)],
    ['Outstanding Balance (BDT)', Number(borrower.outstanding_balance)],
    ['Credit Status', borrower.credit_status],
  ];
  for (const [label, value] of fields) {
    const row = summary.addRow([label, value]);
    row.getCell(1).font = { bold: true, color: { argb: BRAND_NAVY } };
    if (typeof value === 'number') row.getCell(2).numFmt = MONEY_FMT;
    if (label === 'Credit Status') applyStatusBadge(row.getCell(2), value);
  }
  autoWidth(summary, 2, [22, 30], 4);

  const loanSheet = wb.addWorksheet('Loans', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const loanHeaderRow = loanSheet.addRow(['Loan Code', 'Amount (BDT)', 'Tenure', 'Total Payable (BDT)', 'Status']);
  styleHeaderRow(loanHeaderRow);
  loans.forEach((l, i) => {
    const row = loanSheet.addRow([l.loan_code, Number(l.loan_amount), `${l.tenure} ${l.repayment_frequency}`, Number(l.total_payable), l.status]);
    styleDataRow(row, i % 2 === 1);
    row.getCell(2).numFmt = MONEY_FMT;
    row.getCell(4).numFmt = MONEY_FMT;
  });
  autoWidth(loanSheet, 5, [22, 16, 14, 18, 14]);

  const paySheet = wb.addWorksheet('Payments', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const payHeaderRow = paySheet.addRow(['Receipt No.', 'Loan Code', 'Date', 'Amount Paid (BDT)', 'Method']);
  styleHeaderRow(payHeaderRow);
  payments.forEach((p, i) => {
    const row = paySheet.addRow([p.receipt_no, p.loan_code, new Date(p.payment_date), Number(p.amount_paid), p.payment_method]);
    styleDataRow(row, i % 2 === 1);
    row.getCell(3).numFmt = 'yyyy-mm-dd';
    row.getCell(4).numFmt = MONEY_FMT;
  });
  autoWidth(paySheet, 5, [22, 16, 14, 18, 14]);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Single payment receipt. */
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
    ['Borrower', receipt.full_name],
    ['Borrower Code', receipt.borrower_code],
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

function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(/[:\\/?*[\]]/g, '').trim().slice(0, 28) || 'Borrower';
  let final = base;
  let i = 1;
  while (used.has(final)) {
    final = `${base}${i++}`.slice(0, 31);
  }
  used.add(final);
  return final;
}
