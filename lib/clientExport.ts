import { money, memberSerial, amountInWords } from './utils';

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

// ---------------------------------------------------------------------
// Report / Receipt header & footer (Settings > Report / Receipt Header & Footer)
// ---------------------------------------------------------------------
type TextStyle = { bold: boolean; italic: boolean; size: 'sm' | 'md' | 'lg'; color: string; align: 'left' | 'center' | 'right' };

type Branding = {
  headerText: string;
  footerAddress: string;
  footerContact: string;
  footerEmail: string;
  headerStyle: TextStyle;
  footerStyle: TextStyle;
  logo: { dataUrl: string; format: 'PNG' | 'JPEG'; ratio: number } | null;
};

const DEFAULT_HEADER_STYLE: TextStyle = { bold: true, italic: false, size: 'md', color: '#0F2A3F', align: 'left' };
const DEFAULT_FOOTER_STYLE: TextStyle = { bold: false, italic: false, size: 'md', color: '#3C4650', align: 'center' };

function mergeStyle(base: TextStyle, input: any): TextStyle {
  const st: TextStyle = { ...base };
  if (input && typeof input === 'object') {
    if (typeof input.bold === 'boolean') st.bold = input.bold;
    if (typeof input.italic === 'boolean') st.italic = input.italic;
    if (['sm', 'md', 'lg'].includes(input.size)) st.size = input.size;
    if (typeof input.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.color)) st.color = input.color;
    if (['left', 'center', 'right'].includes(input.align)) st.align = input.align;
  }
  return st;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}

function pdfFontStyle(st: TextStyle): string {
  return st.bold && st.italic ? 'bolditalic' : st.bold ? 'bold' : st.italic ? 'italic' : 'normal';
}

const HEADER_PT = { report: { sm: 12, md: 15, lg: 19 }, receipt: { sm: 13, md: 16, lg: 20 } };
const FOOTER_PT = { report: { sm: 6.5, md: 7.5, lg: 9 }, receipt: { sm: 7.5, md: 8.5, lg: 10 } };

/** The branding of the document currently being built (set at the start of each builder). */
let activeBranding: Branding | null = null;

async function loadBranding(): Promise<Branding | null> {
  try {
    const res = await fetch('/api/doc-branding', { cache: 'no-store' });
    if (!res.ok) return null;
    const j = await res.json();
    let logo: Branding['logo'] = null;
    if (j.logo) {
      const ratio = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
        img.onerror = () => resolve(1);
        img.src = j.logo;
      });
      logo = { dataUrl: j.logo, format: String(j.logo).startsWith('data:image/png') ? 'PNG' : 'JPEG', ratio };
    }
    const b: Branding = {
      headerText: j.headerText || '',
      footerAddress: j.footerAddress || '',
      footerContact: j.footerContact || '',
      footerEmail: j.footerEmail || '',
      headerStyle: mergeStyle(DEFAULT_HEADER_STYLE, j.style?.header),
      footerStyle: mergeStyle(DEFAULT_FOOTER_STYLE, j.style?.footer),
      logo,
    };
    return b.headerText || b.footerAddress || b.footerContact || b.footerEmail || b.logo ? b : null;
  } catch {
    return null;
  }
}

function footerLines(b: Branding | null): string[] {
  return b ? ([b.footerAddress, b.footerContact, b.footerEmail].filter(Boolean) as string[]) : [];
}

/** Draws the header text in its saved style between xStart and xEnd. */
function drawHeaderText(doc: any, b: Branding, xStart: number, xEnd: number, y: number, kind: 'report' | 'receipt') {
  if (!b.headerText) return;
  const st = b.headerStyle;
  doc.setFont('helvetica', pdfFontStyle(st));
  doc.setFontSize(HEADER_PT[kind][st.size]);
  doc.setTextColor(...hexToRgb(st.color));
  const t = fitTextWidth(doc, b.headerText, xEnd - xStart);
  if (st.align === 'center') doc.text(t, (xStart + xEnd) / 2, y, { align: 'center' });
  else if (st.align === 'right') doc.text(t, xEnd, y, { align: 'right' });
  else doc.text(t, xStart, y);
}

/** Draws the footer lines (address, contact, email) in their saved style. */
function drawFooterBlock(doc: any, b: Branding, xStart: number, xEnd: number, ruleY: number, lineH: number, kind: 'report' | 'receipt') {
  const lines = footerLines(b);
  if (!lines.length) return;
  const st = b.footerStyle;
  doc.setDrawColor(...hexToRgb(b.headerStyle.color));
  doc.setLineWidth(0.3);
  doc.line(xStart, ruleY, xEnd, ruleY);
  doc.setFont('helvetica', pdfFontStyle(st));
  doc.setFontSize(FOOTER_PT[kind][st.size]);
  doc.setTextColor(...hexToRgb(st.color));
  let y = ruleY + lineH;
  for (const line of lines) {
    const t = fitTextWidth(doc, line, xEnd - xStart);
    if (st.align === 'left') doc.text(t, xStart, y);
    else if (st.align === 'right') doc.text(t, xEnd, y, { align: 'right' });
    else doc.text(t, (xStart + xEnd) / 2, y, { align: 'center' });
    y += lineH;
  }
  doc.setLineWidth(0.5);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
}

/** Logo size in mm for a given height, capped to a sensible width. */
function logoSizeMm(b: Branding, heightMm: number): { w: number; h: number } {
  const ratio = b.logo?.ratio || 1;
  const w = Math.min(heightMm * ratio, 40);
  return { w, h: w / ratio };
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const bin = atob(dataUrl.split(',')[1] || '');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
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
  const b = activeBranding;
  if (b && (b.headerText || b.logo)) {
    // Branded header: logo + header text, report title underneath, then a line.
    let x = 12;
    if (b.logo) {
      const { w, h } = logoSizeMm(b, 14);
      doc.addImage(b.logo.dataUrl, b.logo.format, 11, 8 + (14 - h) / 2, w, h);
      x = 11 + w + 4;
    }
    drawHeaderText(doc, b, x, 198, 15, 'report');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(fitTextWidth(doc, `${title}  •  ${subtitle}`, 198 - x), b.headerStyle.align === 'right' ? 198 : b.headerStyle.align === 'center' ? (x + 198) / 2 : x, 21.5, { align: b.headerStyle.align });
    doc.setDrawColor(...hexToRgb(b.headerStyle.color));
    doc.setLineWidth(0.8);
    doc.line(10, 25.5, 200, 25.5);
    doc.setLineWidth(0.5);
    doc.setTextColor(0, 0, 0);
    return;
  }
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
  const b = activeBranding;
  if (b && footerLines(b).length) drawFooterBlock(doc, b, 12, 198, 264, 4, 'report');
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

/** Gold footer bar whose totals sit directly under the register's columns (same x positions as the table),
 *  with the Savings total in its own teal cell. Drawn on every page. */
function drawReportFooter(doc: any, X: number, totals: ReturnType<typeof loanReportTotals>) {
  const footerY = 279;
  const b = activeBranding;
  if (b && footerLines(b).length) drawFooterBlock(doc, b, 12, 198, 264, 4, 'report');
  doc.setFillColor(...RGB_GOLD);
  doc.rect(6, footerY, 198, 12, 'F');

  const widths: number[] = Object.keys(SINGLE_REPORT_COL_STYLES).map((k) => SINGLE_REPORT_COL_STYLES[Number(k)].cellWidth);
  const xs: number[] = [];
  let x = X;
  for (const w of widths) { xs.push(x); x += w; }

  // Savings cell: different colour, like the Savings column above it
  doc.setFillColor(...RGB_TEAL);
  doc.rect(xs[13], footerY, widths[13] + 4, 12, 'F');

  const cells: [number, string, string][] = [
    [1, 'GRAND TOTAL', ''],
    [3, 'Loan Amt', money(totals.loanAmount)],
    [5, 'Payable', money(totals.totalPayable)],
    [8, 'Paid', money(totals.totalPaid)],
    [9, 'Remaining', money(totals.remaining)],
    [13, 'Savings', money(totals.savings)],
  ];
  doc.setTextColor(255, 255, 255);
  for (const [col, caption, value] of cells) {
    const cx = xs[col] + 1;
    if (!value) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(caption, cx, footerY + 7.4);
      continue;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.text(caption, cx, footerY + 4.6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(value.length > 11 ? 5.4 : 6.4);
    doc.text(value, cx, footerY + 9.2);
  }
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
  doc.setFontSize(w < 40 ? 9 : 11);
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

function progressText(r: any): string {
  return `${r.paid_count ?? 0}/${r.total_count || r.tenure}`;
}

// One layout for every report (all members, single member; PDF / Word / Excel / screen):
// SL = member serial, ID sits beside the name, membership date added, savings is the last column.
const SINGLE_REPORT_HEAD = [
  'SL', 'Name (ID)', 'Membership Date', 'Loan Amount', 'Disbursement Date', 'Total Payable',
  'Installment Amt', 'Tenure', 'Total Paid', 'Remaining Balance', 'Maturity Date', 'Last Payment Date', 'Contact', 'Savings',
];
const SINGLE_REPORT_COL_STYLES: Record<number, any> = {
  0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 26 }, 2: { cellWidth: 14 }, 3: { cellWidth: 13 },
  4: { cellWidth: 14 }, 5: { cellWidth: 13 }, 6: { cellWidth: 11 }, 7: { cellWidth: 10, halign: 'center' },
  8: { cellWidth: 13 }, 9: { cellWidth: 13 }, 10: { cellWidth: 14 }, 11: { cellWidth: 14 }, 12: { cellWidth: 14 }, 13: { cellWidth: 13 },
};
const REPORT_EMPTY_ROW = ['—', 'No disbursed loans.', '', '', '', '', '', '', '', '', '', '', '', ''];

function singleReportRow(r: any, sl: number): string[] {
  return [
    memberSerial(r.borrower_code, sl),
    `${r.full_name} (${r.borrower_code})`,
    fmtDate(r.membership_date),
    money(r.loan_amount),
    fmtDate(r.disbursement_date),
    money(r.total_payable),
    money(r.installment_amount),
    progressText(r),
    money(r.total_paid),
    money(r.remaining_balance),
    fmtDate(r.maturity_date),
    fmtDate(r.last_payment_date),
    r.phone || '—',
    r.savings_balance == null ? '—' : money(r.savings_balance),
  ];
}

/** Savings (last) column is coloured differently from the rest of the table. */
function reportCellHook(data: any) {
  if (data.column.index !== 13) return;
  if (data.section === 'head') {
    data.cell.styles.fillColor = RGB_TEAL;
    data.cell.styles.textColor = [255, 255, 255];
  } else if (data.section === 'body') {
    data.cell.styles.fillColor = RGB_TEAL_LIGHT;
    data.cell.styles.textColor = [10, 90, 86];
    data.cell.styles.fontStyle = 'bold';
  } else if (data.section === 'foot') {
    data.cell.styles.fillColor = [178, 226, 222];
    data.cell.styles.textColor = [10, 90, 86];
  }
}

function reportTotalsRow(totals: ReturnType<typeof loanReportTotals>): string[] {
  return ['', 'TOTAL', '', money(totals.loanAmount), '', money(totals.totalPayable), '', '', money(totals.totalPaid), money(totals.remaining), '', '', '', money(totals.savings)];
}

/** Five coloured summary boxes across the top of a report. */
function drawReportStats(doc: any, X: number, y: number, totals: ReturnType<typeof loanReportTotals>) {
  const w = 33.6, gap = 4.5, h = 16;
  const items: [string, number, [number, number, number], [number, number, number]][] = [
    ['LOAN AMOUNT', totals.loanAmount, [224, 231, 241], RGB_NAVY],
    ['PAYABLE', totals.totalPayable, [224, 231, 241], RGB_NAVY],
    ['PAID', totals.totalPaid, RGB_GREEN_LIGHT, RGB_GREEN],
    ['REMAINING', totals.remaining, RGB_RED_LIGHT, RGB_RED],
    ['SAVINGS', totals.savings, RGB_TEAL_LIGHT, RGB_TEAL],
  ];
  items.forEach((it, i) => drawStatBox(doc, X + i * (w + gap), y, w, h, it[0], `Tk ${money(it[1])}`, it[2], it[3]));
}

function loanReportTotals(rows: any[]) {
  return {
    loanAmount: rows.reduce((s, r) => s + Number(r.loan_amount), 0),
    totalPayable: rows.reduce((s, r) => s + Number(r.total_payable), 0),
    totalPaid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
    remaining: rows.reduce((s, r) => s + Number(r.remaining_balance), 0),
    savings: rows.reduce((s, r) => s + (r.savings_balance == null ? 0 : Number(r.savings_balance)), 0),
  };
}

/** Single member report — a loan-register table (one row per disbursed loan for this
 *  member) plus every individual payment across all of that member's loans. */
export async function buildSingleUserPdfBlob(member: any, loanRows: any[] = [], payments: any[] = []): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  activeBranding = await loadBranding();
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  const totals = loanReportTotals(loanRows);

  drawPageBorder(doc);
  drawBanner(doc, 'Member Credit / Debt Report', `Generated: ${new Date().toLocaleString()}  •  ${member.full_name} (${member.borrower_code})`);

  const boxY = 32, boxH = 16;
  drawReportStats(doc, X, boxY, totals);

  let y = boxY + boxH + 8;
  drawSectionHeader(doc, 'Loan Register', X, y, W, RGB_NAVY);
  autoTable(doc, {
    startY: y + 7,
    head: [SINGLE_REPORT_HEAD],
    body: loanRows.length ? loanRows.map((r, i) => singleReportRow(r, i + 1)) : [REPORT_EMPTY_ROW],
    foot: loanRows.length ? [reportTotalsRow(totals)] : undefined,
    headStyles: { fillColor: RGB_NAVY, fontSize: 6 },
    footStyles: { fillColor: [244, 248, 248], textColor: RGB_NAVY, fontStyle: 'bold', fontSize: 6.3 },
    styles: { fontSize: 6.3, cellPadding: 1.4 },
    columnStyles: SINGLE_REPORT_COL_STYLES,
    margin: { left: X, right: X, bottom: 32 },
    didParseCell: reportCellHook,
    didDrawPage: () => drawPageBorder(doc),
  });

  // Payment history — every individual payment across all of this member's loans,
  // oldest first, with a remaining-balance column. The final row's "TOTAL PAID"
  // label sits in the Particulars column with the grand total under Amount Paid.
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
  else payBody.push(['', '', 'TOTAL PAID', '', `Tk ${money(running)}`, `Tk ${money(Math.max(0, totals.totalPayable - running))}`]);

  autoTable(doc, {
    startY: y + 7,
    head: [['SL', 'Receipt No.', 'Particulars', 'Date', 'Amount Paid', 'Remaining Balance']],
    body: payBody,
    theme: 'grid',
    headStyles: { fillColor: RGB_TEAL, lineColor: RGB_BLACK, lineWidth: 0.3 },
    styles: { fontSize: 7.5, lineColor: RGB_BLACK, lineWidth: 0.3 },
    margin: { left: X, right: X, bottom: 32 },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.row.index === payBody.length - 1 && payments.length > 0) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = RGB_TEAL_LIGHT;
      }
    },
    didDrawPage: () => {
      drawPageBorder(doc);
      drawReportFooter(doc, X, totals);
    },
  });
  drawReportFooter(doc, X, totals);

  return doc.output('blob');
}

/** All members report — a loan-register table with one row PER LOAN across every
 *  member (a member with two disbursed loans appears twice), with grand totals. */
export async function buildAllUsersPdfBlob(loanRows: any[]): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  activeBranding = await loadBranding();
  const doc = new jsPDF();
  const X = 12;
  const W = 186;

  const totals = loanReportTotals(loanRows);

  drawPageBorder(doc);
  drawBanner(doc, 'All Loans - Full Register', `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`);

  const boxY = 32, boxH = 16;
  drawReportStats(doc, X, boxY, totals);

  const y = boxY + boxH + 8;
  drawSectionHeader(doc, 'All Loans Register', X, y, W, RGB_GOLD);

  const bodyRows = loanRows.length ? loanRows.map((r, i) => singleReportRow(r, i + 1)) : [REPORT_EMPTY_ROW];
  const footFigures: [string, string][] = [
    ['Total Loan', `Tk ${money(totals.loanAmount)}`],
    ['Total Payable', `Tk ${money(totals.totalPayable)}`],
    ['Total Paid', `Tk ${money(totals.totalPaid)}`],
    ['Remaining', `Tk ${money(totals.remaining)}`],
    ['Savings', `Tk ${money(totals.savings)}`],
  ];

  autoTable(doc, {
    startY: y + 7,
    head: [SINGLE_REPORT_HEAD],
    body: bodyRows,
    foot: loanRows.length ? [reportTotalsRow(totals)] : undefined,
    headStyles: { fillColor: RGB_GOLD, fontSize: 6 },
    footStyles: { fillColor: [244, 248, 248], textColor: RGB_NAVY, fontStyle: 'bold', fontSize: 6.3 },
    styles: { fontSize: 6.3, cellPadding: 1.4 },
    columnStyles: SINGLE_REPORT_COL_STYLES,
    didParseCell: reportCellHook,
    margin: { left: X, right: X, bottom: 32 },
    // The bottom-total footer bar is drawn on EVERY page (not just the last), so a
    // multi-page loan register never loses its running grand totals off the bottom
    // of a page — this is the fix for the previously "missing" totals bar.
    didDrawPage: () => {
      drawPageBorder(doc);
      drawReportFooter(doc, X, totals);
    },
  });
  drawReportFooter(doc, X, totals);

  return doc.output('blob');
}

export async function buildReceiptPdfBlob(receipt: any): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const branding = await loadBranding();
  activeBranding = branding;
  const doc = new jsPDF();

  // Outer border around the whole receipt
  doc.setDrawColor(15, 42, 63);
  doc.setLineWidth(0.6);
  doc.rect(12, 12, 186, 190);
  doc.setLineWidth(0.2);
  doc.rect(14, 14, 182, 186);
  // Teal ribbon along the top inside the border
  doc.setFillColor(20, 149, 143);
  doc.rect(14, 14, 182, 3, 'F');

  if (branding && (branding.headerText || branding.logo)) {
    // Branded header: logo, header text, "Payment Receipt", then a line.
    let x = 20;
    if (branding.logo) {
      const { w, h } = logoSizeMm(branding, 16);
      doc.addImage(branding.logo.dataUrl, branding.logo.format, 20, 20 + (16 - h) / 2, w, h);
      x = 20 + w + 5;
    }
    drawHeaderText(doc, branding, x, 190, 27, 'receipt');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(20, 149, 143);
    const subAlign = branding.headerStyle.align;
    doc.text('Payment Receipt', subAlign === 'right' ? 190 : subAlign === 'center' ? (x + 190) / 2 : x, 34, { align: subAlign });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(...hexToRgb(branding.headerStyle.color));
    doc.setLineWidth(0.6);
    doc.line(20, 39, 190, 39);
    doc.setLineWidth(0.2);
  } else {
    doc.setTextColor(15, 42, 63);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('MicroLoan Admin', 105, 28, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(20, 149, 143);
    doc.text('Payment Receipt', 105, 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(15, 42, 63);
    doc.line(20, 39, 190, 39);
  }

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
    startY: 45,
    body: rows,
    theme: 'grid',
    styles: { fontSize: 11, cellPadding: 2.5, lineColor: [200, 214, 224], lineWidth: 0.2, textColor: [30, 41, 59] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50, textColor: [15, 42, 63], fillColor: [228, 241, 247] } },
    alternateRowStyles: { fillColor: [250, 252, 253] },
    margin: { left: 20, right: 20 },
  });

  const afterTable = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(255, 246, 220);
  doc.rect(20, afterTable, 170, 16, 'F');
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.4);
  doc.rect(20, afterTable, 170, 16);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 80, 0);
  doc.text('Amount Paid', 25, afterTable + 10);
  doc.setFontSize(15);
  doc.setTextColor(20, 149, 143);
  doc.text(`Tk ${money(receipt.amount_paid)}`, 185, afterTable + 10, { align: 'right' });

  // Amount in words, directly under the Amount Paid box
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 42, 63);
  const words = doc.splitTextToSize(`In words: ${amountInWords(receipt.amount_paid)}`, 168);
  doc.text(words, 22, afterTable + 23);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  if (branding && footerLines(branding).length) {
    drawFooterBlock(doc, branding, 20, 190, 178, 5, 'receipt');
  }

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
  const headerText = activeBranding?.headerText;
  // With a header text set, it replaces the "MicroLoan Admin" prefix of the title.
  cell.value = headerText ? `${headerText}${text.includes(' — ') ? ' — ' + text.split(' — ').slice(1).join(' — ') : ''}` : text;
  cell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: BRAND_NAVY } };
  cell.alignment = { horizontal: 'left' };
  ws.getRow(1).height = 22;
}

/** Address + contact lines at the bottom of the first sheet (Report/Receipt footer setting). */
function addExcelFooter(ws: any, span: number) {
  const b = activeBranding;
  if (!b || !footerLines(b).length) return;
  ws.addRow([]);
  for (const line of footerLines(b)) {
    if (!line) continue;
    const row = ws.addRow([line]);
    ws.mergeCells(row.number, 1, row.number, span);
    row.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: 'FF4B5B66' } };
    row.getCell(1).alignment = { horizontal: 'center' };
  }
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

const EXCEL_SINGLE_HEADERS = [
  'SL', 'Name (ID)', 'Membership Date', 'Loan Amount (BDT)', 'Disbursement Date', 'Total Payable (BDT)',
  'Installment Amt (BDT)', 'Tenure', 'Total Paid (BDT)', 'Remaining Balance (BDT)', 'Maturity Date', 'Last Payment Date', 'Contact', 'Savings (BDT)',
];
const EXCEL_REPORT_WIDTHS = [6, 26, 14, 16, 16, 16, 16, 10, 16, 18, 12, 14, 16, 16];
function addSingleReportRow(ws: any, r: any, sl: number, striped: boolean) {
  const row = ws.addRow([
    Number(memberSerial(r.borrower_code, sl)) || sl,
    `${r.full_name} (${r.borrower_code})`,
    r.membership_date ? new Date(r.membership_date) : null,
    Number(r.loan_amount),
    r.disbursement_date ? new Date(r.disbursement_date) : null,
    Number(r.total_payable), Number(r.installment_amount), progressText(r), Number(r.total_paid), Number(r.remaining_balance),
    r.maturity_date ? new Date(r.maturity_date) : null,
    r.last_payment_date ? new Date(r.last_payment_date) : null,
    r.phone || '',
    r.savings_balance == null ? null : Number(r.savings_balance),
  ]);
  styleDataRow(row, striped);
  row.getCell(3).numFmt = 'yyyy-mm-dd';
  row.getCell(4).numFmt = MONEY_FMT;
  row.getCell(5).numFmt = 'yyyy-mm-dd';
  row.getCell(6).numFmt = MONEY_FMT;
  row.getCell(7).numFmt = MONEY_FMT;
  row.getCell(9).numFmt = MONEY_FMT;
  row.getCell(10).numFmt = MONEY_FMT;
  row.getCell(11).numFmt = 'yyyy-mm-dd';
  row.getCell(12).numFmt = 'yyyy-mm-dd';
  row.getCell(14).numFmt = MONEY_FMT;
  // Savings column: its own colour
  row.getCell(14).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
  row.getCell(14).font = { bold: true, color: { argb: 'FF0A5A56' } };
  return row;
}

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
    progressText(r),
    Number(r.total_paid),
    Number(r.remaining_balance),
    r.maturity_date ? new Date(r.maturity_date) : null,
    r.last_payment_date ? new Date(r.last_payment_date) : null,
    r.phone || '',
  ]);
  styleDataRow(row, striped);
  row.getCell(2).numFmt = 'yyyy-mm-dd';
  row.getCell(5).numFmt = MONEY_FMT;
  row.getCell(6).numFmt = MONEY_FMT;
  row.getCell(7).numFmt = MONEY_FMT;
  row.getCell(10).numFmt = MONEY_FMT;
  row.getCell(11).numFmt = MONEY_FMT;
  row.getCell(12).numFmt = 'yyyy-mm-dd';
  row.getCell(13).numFmt = 'yyyy-mm-dd';
  return row;
}

/** All members report — a single sheet, one row PER LOAN across every member. */
export async function buildAllUsersExcelBlob(loanRows: any[]): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  activeBranding = await loadBranding();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Loan Register', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' },
  });
  titleRow(summary, 'MicroLoan Admin — All Loans Register', EXCEL_SINGLE_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`, EXCEL_SINGLE_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_SINGLE_HEADERS);
  styleHeaderRow(headerRow);

  loanRows.forEach((r, i) => addSingleReportRow(summary, r, i + 1, i % 2 === 1));

  const totals = loanReportTotals(loanRows);
  const totalRow = summary.addRow(['', 'TOTAL', '', totals.loanAmount, '', totals.totalPayable, '', '', totals.totalPaid, totals.remaining, '', '', '', totals.savings]);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(4).numFmt = MONEY_FMT;
  totalRow.getCell(6).numFmt = MONEY_FMT;
  totalRow.getCell(9).numFmt = MONEY_FMT;
  totalRow.getCell(10).numFmt = MONEY_FMT;
  totalRow.getCell(14).numFmt = MONEY_FMT;

  autoWidth(summary, EXCEL_SINGLE_HEADERS.length, EXCEL_REPORT_WIDTHS, 4);

  addExcelFooter(summary, EXCEL_SINGLE_HEADERS.length);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Single member report — loan-register sheet, plus a Payments sheet (black-bordered,
 *  no running-total column) with a remaining-balance column instead. */
export async function buildSingleUserExcelBlob(member: any, loanRows: any[] = [], payments: any[] = []): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  activeBranding = await loadBranding();
  wb.creator = 'MicroLoan Admin';
  wb.created = new Date();

  const summary = wb.addWorksheet('Loan Register', { pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: 'landscape' } });
  titleRow(summary, `Member Credit / Debt Report — ${member.full_name} (${member.borrower_code})`, EXCEL_SINGLE_HEADERS.length);
  subtitleRow(summary, 2, `Generated: ${new Date().toLocaleString()}`, EXCEL_SINGLE_HEADERS.length);
  summary.addRow([]);
  const headerRow = summary.addRow(EXCEL_SINGLE_HEADERS);
  styleHeaderRow(headerRow);

  loanRows.forEach((r, i) => addSingleReportRow(summary, r, i + 1, i % 2 === 1));

  const totals = loanReportTotals(loanRows);
  const totalRow = summary.addRow(['', 'TOTAL', '', totals.loanAmount, '', totals.totalPayable, '', '', totals.totalPaid, totals.remaining, '', '', '', totals.savings]);
  totalRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    cell.border = { top: { style: 'thin', color: { argb: BRAND_TEAL } } };
  });
  totalRow.getCell(4).numFmt = MONEY_FMT;
  totalRow.getCell(6).numFmt = MONEY_FMT;
  totalRow.getCell(9).numFmt = MONEY_FMT;
  totalRow.getCell(10).numFmt = MONEY_FMT;
  totalRow.getCell(14).numFmt = MONEY_FMT;

  autoWidth(summary, EXCEL_SINGLE_HEADERS.length, EXCEL_REPORT_WIDTHS, 4);

  // Payments sheet — every individual payment, oldest first, with a black border and
  // a remaining-balance column. The final row's "TOTAL PAID" label sits in the
  // Particulars column with the grand total under Amount Paid.
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
    const totalPayRow = paySheet.addRow(['', '', 'TOTAL PAID', '', running, Math.max(0, totals.totalPayable - running)]);
    totalPayRow.eachCell((cell: any) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F6F5' } };
    });
    styleDataRowBlackBorder(totalPayRow);
    totalPayRow.getCell(5).numFmt = MONEY_FMT;
    totalPayRow.getCell(6).numFmt = MONEY_FMT;
  }

  autoWidth(paySheet, 6, [6, 14, 16, 14, 16, 18]);

  addExcelFooter(summary, EXCEL_SINGLE_HEADERS.length);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function buildReceiptExcelBlob(receipt: any): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  activeBranding = await loadBranding();
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

  addExcelFooter(ws, 2);

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

/** Word header (logo + text + line below) and footer (address + contact + email) for a section. */
function docxBranding(Docx: any, b: Branding | null): Record<string, any> {
  if (!b) return {};
  const out: Record<string, any> = {};
  const alignOf = (a: string) => (a === 'center' ? Docx.AlignmentType.CENTER : a === 'right' ? Docx.AlignmentType.RIGHT : Docx.AlignmentType.LEFT);
  const hex = (c: string) => c.replace('#', '').toUpperCase();
  if (b.headerText || b.logo) {
    const st = b.headerStyle;
    const children: any[] = [];
    if (b.logo) {
      const wPx = Math.round(Math.min(48 * b.logo.ratio, 150));
      children.push(new Docx.ImageRun({
        type: b.logo.format === 'PNG' ? 'png' : 'jpg',
        data: dataUrlToBytes(b.logo.dataUrl),
        transformation: { width: wPx, height: Math.round(wPx / b.logo.ratio) },
      }));
      children.push(new Docx.TextRun({ text: '   ' }));
    }
    if (b.headerText) {
      children.push(new Docx.TextRun({
        text: b.headerText, bold: st.bold, italics: st.italic, color: hex(st.color),
        size: st.size === 'sm' ? 24 : st.size === 'lg' ? 40 : 32,
      }));
    }
    out.headers = {
      default: new Docx.Header({
        children: [new Docx.Paragraph({
          alignment: alignOf(st.align),
          children,
          border: { bottom: { style: Docx.BorderStyle.SINGLE, size: 12, color: hex(st.color), space: 4 } },
        })],
      }),
    };
  }
  const lines = footerLines(b);
  if (lines.length) {
    const fs = b.footerStyle;
    out.footers = {
      default: new Docx.Footer({
        children: lines.map((t, i) => new Docx.Paragraph({
          alignment: alignOf(fs.align),
          border: i === 0 ? { top: { style: Docx.BorderStyle.SINGLE, size: 6, color: hex(b.headerStyle.color), space: 4 } } : undefined,
          children: [new Docx.TextRun({
            text: t, bold: fs.bold, italics: fs.italic, color: hex(fs.color),
            size: fs.size === 'sm' ? 13 : fs.size === 'lg' ? 20 : 16,
          })],
        })),
      }),
    };
  }
  return out;
}

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
  const branding = await loadBranding();

  const totals = loanReportTotals(loanRows);
  const loanTableRows = loanRows.length ? loanRows.map((r, i) => singleReportRow(r, i + 1)) : [REPORT_EMPTY_ROW];

  const ordered = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
  let running = 0;
  const payRows = ordered.map((p, i) => {
    running += Number(p.amount_paid);
    const remaining = Math.max(0, totals.totalPayable - running);
    return [String(i + 1), p.receipt_no, p.notes || 'Installment', fmtDate(p.payment_date), `Tk ${money(p.amount_paid)}`, `Tk ${money(remaining)}`];
  });
  if (payRows.length === 0) payRows.push(['', 'No payments recorded.', '', '', '', '']);
  else payRows.push(['', '', 'TOTAL PAID', '', `Tk ${money(running)}`, `Tk ${money(Math.max(0, totals.totalPayable - running))}`]);

  const doc = new Docx.Document({
    sections: [
      {
        ...docxBranding(Docx, branding),
        children: [
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Member Credit / Debt Report', bold: true, size: 32, color: DOCX_NAVY })] }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: `Generated: ${new Date().toLocaleString()}  •  ${member.full_name} (${member.borrower_code})`, italics: true, size: 18, color: '6B7C85' })] }),
          new Docx.Paragraph({ text: '' }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'Loan Register', bold: true, size: 22, color: DOCX_NAVY })] }),
          docxSummaryTable(Docx, SINGLE_REPORT_HEAD, loanTableRows, DOCX_NAVY),
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
  const branding = await loadBranding();

  const totals = loanReportTotals(loanRows);
  const loanTableRows = loanRows.length ? loanRows.map((r, i) => singleReportRow(r, i + 1)) : [REPORT_EMPTY_ROW];

  const doc = new Docx.Document({
    sections: [
      {
        ...docxBranding(Docx, branding),
        children: [
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: 'All Loans - Full Register', bold: true, size: 32, color: DOCX_NAVY })] }),
          new Docx.Paragraph({ children: [new Docx.TextRun({ text: `Generated: ${new Date().toLocaleString()}  •  ${loanRows.length} loan(s)`, italics: true, size: 18, color: '6B7C85' })] }),
          new Docx.Paragraph({ text: '' }),
          docxSummaryTable(Docx, SINGLE_REPORT_HEAD, loanTableRows, DOCX_GOLD),
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
