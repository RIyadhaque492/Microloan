'use client';

import { useState } from 'react';
import { money } from '@/lib/utils';
import {
  shareOrDownloadBlob,
  buildSingleUserPdfBlob,
  buildSingleUserExcelBlob,
  buildSingleUserWordBlob,
  buildAllUsersPdfBlob,
  buildAllUsersExcelBlob,
  buildAllUsersWordBlob,
} from '@/lib/clientExport';

type Props =
  | { mode: 'single'; member: any; loanRows: any[]; payments: any[]; shareText: string; onDark?: boolean }
  | { mode: 'all'; loanRows: any[]; shareText: string; onDark?: boolean };

type Preview =
  | { kind: 'excel'; filename: string; mimeType: string }
  | { kind: 'word'; filename: string; mimeType: string }
  | { kind: 'text' };

function fmtDate(d: any) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

export default function ExportButtons(props: Props) {
  const [loading, setLoading] = useState<null | 'pdf' | 'excel' | 'word'>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);

  const btnClass = props.onDark
    ? 'btn bg-white/15 backdrop-blur border border-white/30 text-white hover:bg-white/25 !py-1.5 !px-3 text-xs'
    : 'btn btn-outline';

  function closePreview() {
    setPreview(null);
    setCopied(false);
  }

  // PDF opens directly in a new browser tab — the browser's own viewer gives a full-page
  // preview with native zoom/print/download, which is far better than a cramped in-app iframe.
  async function openPdfInNewTab() {
    setLoading('pdf');
    try {
      const blob =
        props.mode === 'single'
          ? await buildSingleUserPdfBlob(props.member, props.loanRows, props.payments)
          : await buildAllUsersPdfBlob(props.loanRows);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setLoading(null);
    }
  }

  function openExcelPreview() {
    const filename = props.mode === 'single' ? `member-${props.member.borrower_code}.xlsx` : `all-loans-report.xlsx`;
    setPreview({ kind: 'excel', filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function openWordPreview() {
    const filename = props.mode === 'single' ? `member-${props.member.borrower_code}.docx` : `all-loans-report.docx`;
    setPreview({ kind: 'word', filename, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function openTextPreview() {
    setPreview({ kind: 'text' });
  }

  async function confirmShare() {
    if (!preview) return;
    if (preview.kind === 'excel') {
      setLoading('excel');
      try {
        const blob =
          props.mode === 'single'
            ? await buildSingleUserExcelBlob(props.member, props.loanRows, props.payments)
            : await buildAllUsersExcelBlob(props.loanRows);
        await shareOrDownloadBlob(blob, preview.filename, preview.mimeType);
      } finally {
        setLoading(null);
        closePreview();
      }
      return;
    }
    if (preview.kind === 'word') {
      setLoading('word');
      try {
        const blob =
          props.mode === 'single'
            ? await buildSingleUserWordBlob(props.member, props.loanRows, props.payments)
            : await buildAllUsersWordBlob(props.loanRows);
        await shareOrDownloadBlob(blob, preview.filename, preview.mimeType);
      } finally {
        setLoading(null);
        closePreview();
      }
      return;
    }
    if (preview.kind === 'text') {
      const nav = navigator as any;
      if (nav.share) {
        try {
          await nav.share({ title: 'MicroLoan Report', text: props.shareText });
        } catch {
          /* cancelled */
        }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(props.shareText)}`, '_blank');
      }
      closePreview();
    }
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(props.shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <button onClick={openPdfInNewTab} disabled={loading === 'pdf'} type="button" className={btnClass}>
          {loading === 'pdf' ? 'Opening…' : '📄 PDF'}
        </button>
        <button onClick={openWordPreview} type="button" className={btnClass}>
          📝 Word
        </button>
        <button onClick={openExcelPreview} type="button" className={btnClass}>
          📊 Excel
        </button>
        <button onClick={openTextPreview} type="button" className={btnClass}>
          💬 Share Text
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={closePreview}>
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-navy text-sm">
                {preview.kind === 'excel' && 'Preview — Excel'}
                {preview.kind === 'word' && 'Preview — Word'}
                {preview.kind === 'text' && 'Preview — Message Text'}
              </h3>
              <button onClick={closePreview} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">✕</button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {(preview.kind === 'excel' || preview.kind === 'word') && <TablePreview props={props} />}
              {preview.kind === 'text' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">{props.shareText}</pre>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              {preview.kind === 'text' && (
                <button onClick={handleCopyText} type="button" className="btn btn-outline">{copied ? '✅ Copied' : '📋 Copy'}</button>
              )}
              <button onClick={closePreview} type="button" className="btn btn-outline">Cancel</button>
              <button onClick={confirmShare} disabled={loading === 'excel' || loading === 'word'} type="button" className="btn btn-primary">
                {loading === 'excel' || loading === 'word' ? 'Preparing…' : preview.kind === 'text' ? '📤 Share' : '📤 Share / Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TablePreview({ props }: { props: Props }) {
  const loanRows = props.loanRows;

  const loanTable = (
    <div className="overflow-x-auto">
      <table className="app-table text-xs">
        <thead>
          <tr>
            <th>SL</th><th>Opening</th><th>Name</th><th>Member ID</th><th>Loan Amount</th>
            <th>Total Payable</th><th>Installment Amt</th><th>Qty</th><th>Total Paid</th>
            <th>Remaining Balance</th><th>Maturity Date</th><th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {loanRows.length === 0 && <tr><td colSpan={12} className="text-center text-gray-400 py-3">No disbursed loans.</td></tr>}
          {loanRows.map((r: any, i: number) => (
            <tr key={r.loan_id}>
              <td>{i + 1}</td><td>{fmtDate(r.disbursement_date)}</td><td>{r.full_name}</td><td>{r.borrower_code}</td>
              <td>৳{money(r.loan_amount)}</td><td>৳{money(r.total_payable)}</td><td>৳{money(r.installment_amount)}</td>
              <td>{r.tenure}</td><td>৳{money(r.total_paid)}</td><td>৳{money(r.remaining_balance)}</td>
              <td>{fmtDate(r.maturity_date)}</td><td>{r.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (props.mode === 'single') {
    const totalPayable = loanRows.reduce((s, r) => s + Number(r.total_payable), 0);
    const ordered = [...props.payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    let running = 0;
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Loan Register</h4>
        {loanTable}
        <div>
          <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Payment History ({ordered.length})</h4>
          <table className="app-table border-2 border-black">
            <thead><tr><th>SL</th><th>Receipt No.</th><th>Particulars</th><th>Date</th><th>Amount Paid</th><th>Remaining Balance</th></tr></thead>
            <tbody>
              {ordered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-3">No payments recorded.</td></tr>}
              {ordered.map((p: any, i: number) => {
                running += Number(p.amount_paid);
                const remaining = Math.max(0, totalPayable - running);
                return (
                  <tr key={p.id}>
                    <td className="border border-black">{i + 1}</td><td className="border border-black">{p.receipt_no}</td>
                    <td className="border border-black">{p.notes || 'Installment'}</td><td className="border border-black">{fmtDate(p.payment_date)}</td>
                    <td className="border border-black">৳{money(p.amount_paid)}</td><td className="border border-black font-semibold">৳{money(remaining)}</td>
                  </tr>
                );
              })}
              {ordered.length > 0 && (
                <tr className="bg-tealight font-bold">
                  <td colSpan={4} className="text-right border border-black">TOTAL PAID</td>
                  <td className="border border-black">৳{money(running)}</td>
                  <td className="border border-black">৳{money(Math.max(0, totalPayable - running))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">{loanRows.length} loan(s)</h4>
      {loanTable}
    </div>
  );
}
