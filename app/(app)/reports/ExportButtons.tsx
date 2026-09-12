'use client';

import { useState } from 'react';
import { money } from '@/lib/utils';
import {
  shareOrDownloadBlob,
  buildSingleUserPdfBlob,
  buildSingleUserExcelBlob,
  buildAllUsersPdfBlob,
  buildAllUsersExcelBlob,
} from '@/lib/clientExport';

type Props =
  | { mode: 'single'; borrower: any; loans: any[]; payments: any[]; shareText: string }
  | { mode: 'all'; rows: any[]; shareText: string };

type Preview =
  | { kind: 'pdf'; blob: Blob; url: string; filename: string; mimeType: string }
  | { kind: 'excel'; filename: string; mimeType: string }
  | { kind: 'text' };

export default function ExportButtons(props: Props) {
  const [loading, setLoading] = useState<null | 'pdf' | 'excel'>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [copied, setCopied] = useState(false);

  function closePreview() {
    if (preview?.kind === 'pdf') URL.revokeObjectURL(preview.url);
    setPreview(null);
    setCopied(false);
  }

  async function openPdfPreview() {
    setLoading('pdf');
    try {
      const blob =
        props.mode === 'single'
          ? await buildSingleUserPdfBlob(props.borrower, props.loans, props.payments)
          : await buildAllUsersPdfBlob(props.rows);
      const filename = props.mode === 'single' ? `borrower-${props.borrower.borrower_code}.pdf` : `all-borrowers-report.pdf`;
      const url = URL.createObjectURL(blob);
      setPreview({ kind: 'pdf', blob, url, filename, mimeType: 'application/pdf' });
    } finally {
      setLoading(null);
    }
  }

  function openExcelPreview() {
    const filename = props.mode === 'single' ? `borrower-${props.borrower.borrower_code}.xlsx` : `all-borrowers-report.xlsx`;
    setPreview({ kind: 'excel', filename, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function openTextPreview() {
    setPreview({ kind: 'text' });
  }

  async function confirmShare() {
    if (!preview) return;
    if (preview.kind === 'pdf') {
      await shareOrDownloadBlob(preview.blob, preview.filename, preview.mimeType);
      closePreview();
      return;
    }
    if (preview.kind === 'excel') {
      setLoading('excel');
      try {
        const blob =
          props.mode === 'single'
            ? await buildSingleUserExcelBlob(props.borrower, props.loans, props.payments)
            : await buildAllUsersExcelBlob(props.rows);
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
        <button onClick={openPdfPreview} disabled={loading === 'pdf'} type="button" className="btn btn-outline">
          {loading === 'pdf' ? 'Preparing…' : '📄 PDF'}
        </button>
        <button onClick={openExcelPreview} type="button" className="btn btn-outline">
          📊 Excel
        </button>
        <button onClick={openTextPreview} type="button" className="btn btn-outline">
          💬 Share Text
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={closePreview}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-navy text-sm">
                {preview.kind === 'pdf' && 'Preview — PDF'}
                {preview.kind === 'excel' && 'Preview — Excel'}
                {preview.kind === 'text' && 'Preview — Message Text'}
              </h3>
              <button onClick={closePreview} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">✕</button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {preview.kind === 'pdf' && (
                <iframe src={preview.url} title="PDF preview" className="w-full h-full min-h-[60vh] border border-gray-200 rounded" />
              )}

              {preview.kind === 'excel' && <ExcelPreviewTable props={props} />}

              {preview.kind === 'text' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">{props.shareText}</pre>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              {preview.kind === 'text' && (
                <button onClick={handleCopyText} type="button" className="btn btn-outline">{copied ? '✅ Copied' : '📋 Copy'}</button>
              )}
              <button onClick={closePreview} type="button" className="btn btn-outline">Cancel</button>
              <button onClick={confirmShare} disabled={loading === 'excel'} type="button" className="btn btn-primary">
                {loading === 'excel' ? 'Preparing…' : preview.kind === 'text' ? '📤 Share' : '📤 Share / Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExcelPreviewTable({ props }: { props: Props }) {
  if (props.mode === 'single') {
    return (
      <div className="space-y-4 text-sm">
        <div>
          <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Summary</h4>
          <table className="app-table"><tbody>
            <tr><td>Name</td><td>{props.borrower.full_name}</td></tr>
            <tr><td>Borrower Code</td><td>{props.borrower.borrower_code}</td></tr>
            <tr><td>Total Borrowed</td><td>৳{money(props.borrower.total_borrowed)}</td></tr>
            <tr><td>Total Paid</td><td>৳{money(props.borrower.total_paid)}</td></tr>
            <tr><td>Outstanding</td><td>৳{money(props.borrower.outstanding_balance)}</td></tr>
          </tbody></table>
        </div>
        <div>
          <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Loans ({props.loans.length})</h4>
          <table className="app-table">
            <thead><tr><th>Loan Code</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{props.loans.map((l) => <tr key={l.id}><td>{l.loan_code}</td><td>৳{money(l.loan_amount)}</td><td>{l.status}</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Payments ({props.payments.length})</h4>
          <table className="app-table">
            <thead><tr><th>Receipt</th><th>Date</th><th>Amount</th></tr></thead>
            <tbody>{props.payments.map((p) => <tr key={p.id}><td>{p.receipt_no}</td><td>{new Date(p.payment_date).toLocaleDateString()}</td><td>৳{money(p.amount_paid)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Summary sheet + one sheet per borrower ({props.rows.length} total)</h4>
      <table className="app-table">
        <thead><tr><th>Code</th><th>Name</th><th>Borrowed</th><th>Paid</th><th>Outstanding</th></tr></thead>
        <tbody>
          {props.rows.map((r: any) => (
            <tr key={r.id}><td>{r.borrower_code}</td><td>{r.full_name}</td><td>৳{money(r.total_borrowed)}</td><td>৳{money(r.total_paid)}</td><td>৳{money(r.outstanding_balance)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
