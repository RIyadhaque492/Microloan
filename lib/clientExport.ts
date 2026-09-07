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

export async function buildSingleUserExcelBlob(borrower: any, loans: any[], payments: any[]): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['Borrower Credit / Debt Report'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['Name', borrower.full_name],
    ['Borrower Code', borrower.borrower_code],
    ['Phone', borrower.phone],
    ['Total Borrowed (BDT)', Number(borrower.total_borrowed)],
    ['Total Paid (BDT)', Number(borrower.total_paid)],
    ['Outstanding Balance (BDT)', Number(borrower.outstanding_balance)],
    ['Credit Status', borrower.credit_status],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, 'Summary');

  const loanSheet = XLSX.utils.aoa_to_sheet([
    ['Loan Code', 'Amount (BDT)', 'Tenure', 'Total Payable (BDT)', 'Status'],
    ...loans.map((l) => [l.loan_code, Number(l.loan_amount), `${l.tenure} ${l.repayment_frequency}`, Number(l.total_payable), l.status]),
  ]);
  XLSX.utils.book_append_sheet(wb, loanSheet, 'Loans');

  const paySheet = XLSX.utils.aoa_to_sheet([
    ['Receipt No.', 'Loan Code', 'Date', 'Amount Paid (BDT)', 'Method'],
    ...payments.map((p) => [p.receipt_no, p.loan_code, new Date(p.payment_date).toISOString().slice(0, 10), Number(p.amount_paid), p.payment_method]),
  ]);
  XLSX.utils.book_append_sheet(wb, paySheet, 'Payments');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/octet-stream' });
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

export async function buildAllUsersExcelBlob(rows: any[]): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ['Borrower Code', 'Name', 'Phone', 'Loans', 'Borrowed (BDT)', 'Paid (BDT)', 'Outstanding (BDT)', 'Status'],
    ...rows.map((r) => [r.borrower_code, r.full_name, r.phone, r.loans.length, Number(r.total_borrowed), Number(r.total_paid), Number(r.outstanding_balance), r.credit_status]),
  ]);
  XLSX.utils.book_append_sheet(wb, summary, 'Summary');

  const used = new Set<string>(['Summary']);
  for (const r of rows) {
    const sheetData = [
      [r.full_name, r.borrower_code],
      [`Borrowed: ${money(r.total_borrowed)}`, `Paid: ${money(r.total_paid)}`, `Outstanding: ${money(r.outstanding_balance)}`],
      [],
      ['Loans'],
      ['Loan Code', 'Amount (BDT)', 'Tenure', 'Total Payable (BDT)', 'Status'],
      ...r.loans.map((l: any) => [l.loan_code, Number(l.loan_amount), `${l.tenure} ${l.repayment_frequency}`, Number(l.total_payable), l.status]),
      [],
      ['Payments'],
      ['Receipt No.', 'Loan Code', 'Date', 'Amount Paid (BDT)', 'Method'],
      ...r.payments.map((p: any) => [p.receipt_no, p.loan_code, new Date(p.payment_date).toISOString().slice(0, 10), Number(p.amount_paid), p.payment_method]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheetData), safeSheetName(r.full_name, used));
  }

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/octet-stream' });
}
