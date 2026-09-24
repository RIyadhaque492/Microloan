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
  | { mode: 'single'; borrower: any; payments: any[]; shareText: string; onDark?: boolean }
  | { mode: 'all'; rows: any[]; shareText: string; onDark?: boolean };

type Preview =
  | { kind: 'excel'; filename: string; mimeType: string }
  | { kind: 'word'; filename: string; mimeType: string }
  | { kind: 'text' };

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
          ? await buildSingleUserPdfBlob(props.borrower, props.payments)
          : await buildAllUsersPdfBlob(props.rows);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } finally {
      setLoading(null);
    }
  }

  function openExcelPreview() {
    const filename = props.mode === 'single' ? `member-${props.borrower.borrower_code}.xlsx` : `all-members-report.xlsx`;
    setPreview({ kind: 'excel', filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function openWordPreview() {
    const filename = props.mode === 'single' ? `member-${props.borrower.borrower_code}.docx` : `all-members-report.docx`;
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
            ? await buildSingleUserExcelBlob(props.borrower, props.payments)
            : await buildAllUsersExcelBlob(props.rows);
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
            ? await buildSingleUserWordBlob(props.borrower, props.payments)
            : await buildAllUsersWordBlob(props.rows);
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
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
  if (props.mode === 'single') {
    const ordered = [...props.payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    let running = 0;
    return (
      <div className="space-y-4">
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Loan Amount</th><th>Paid</th><th>Remaining Balance</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td>{props.borrower.borrower_code}</td>
              <td>{props.borrower.full_name}</td>
              <td>৳{money(props.borrower.total_borrowed)}</td>
              <td>৳{money(props.borrower.total_paid)}</td>
              <td>৳{money(props.borrower.outstanding_balance)}</td>
              <td>{props.borrower.credit_status}</td>
            </tr>
          </tbody>
        </table>
        <div>
          <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Payment History ({ordered.length})</h4>
          <table className="app-table">
            <thead><tr><th>SL</th><th>Receipt No.</th><th>Date</th><th>Amount Paid</th><th>Running Total</th></tr></thead>
            <tbody>
              {ordered.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-3">No payments recorded.</td></tr>}
              {ordered.map((p: any, i: number) => {
                running += Number(p.amount_paid);
                return (
                  <tr key={p.id}>
                    <td>{i + 1}</td><td>{p.receipt_no}</td><td>{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td>৳{money(p.amount_paid)}</td><td className="font-semibold">৳{money(running)}</td>
                  </tr>
                );
              })}
              {ordered.length > 0 && (
                <tr className="bg-tealight font-bold">
                  <td colSpan={4} className="text-right">TOTAL PAID</td>
                  <td>৳{money(running)}</td>
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
      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">{props.rows.length} member(s)</h4>
      <table className="app-table">
        <thead><tr><th>Member ID</th><th>Name</th><th>Loan Amount</th><th>Paid</th><th>Remaining Balance</th><th>Status</th></tr></thead>
        <tbody>
          {props.rows.map((r: any) => (
            <tr key={r.id}><td>{r.borrower_code}</td><td>{r.full_name}</td><td>৳{money(r.total_borrowed)}</td><td>৳{money(r.total_paid)}</td><td>৳{money(r.outstanding_balance)}</td><td>{r.credit_status}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
