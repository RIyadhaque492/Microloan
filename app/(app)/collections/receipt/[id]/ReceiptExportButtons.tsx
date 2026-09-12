'use client';

import { useState } from 'react';
import { money } from '@/lib/utils';
import { shareOrDownloadBlob, buildReceiptPdfBlob, buildReceiptExcelBlob } from '@/lib/clientExport';

type Preview = { kind: 'pdf'; blob: Blob; url: string } | { kind: 'excel' } | { kind: 'text' };

export default function ReceiptExportButtons({ receipt, shareText }: { receipt: any; shareText: string }) {
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
      const blob = await buildReceiptPdfBlob(receipt);
      const url = URL.createObjectURL(blob);
      setPreview({ kind: 'pdf', blob, url });
    } finally {
      setLoading(null);
    }
  }

  async function confirmShare() {
    if (!preview) return;
    if (preview.kind === 'pdf') {
      await shareOrDownloadBlob(preview.blob, `receipt-${receipt.receipt_no}.pdf`, 'application/pdf');
      closePreview();
      return;
    }
    if (preview.kind === 'excel') {
      setLoading('excel');
      try {
        const blob = await buildReceiptExcelBlob(receipt);
        await shareOrDownloadBlob(blob, `receipt-${receipt.receipt_no}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
          await nav.share({ title: 'Payment Receipt', text: shareText });
        } catch {
          /* cancelled */
        }
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
      }
      closePreview();
    }
  }

  async function handleCopyText() {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={openPdfPreview} disabled={loading === 'pdf'} type="button" className="btn btn-outline">
          {loading === 'pdf' ? '…' : '📄 PDF'}
        </button>
        <button onClick={() => setPreview({ kind: 'excel' })} type="button" className="btn btn-outline">
          📊 Excel
        </button>
        <button onClick={() => setPreview({ kind: 'text' })} type="button" className="btn btn-outline">
          💬 Share
        </button>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3" onClick={closePreview}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
              {preview.kind === 'excel' && (
                <table className="app-table text-sm">
                  <tbody>
                    <tr><td>Receipt No.</td><td>{receipt.receipt_no}</td></tr>
                    <tr><td>Date</td><td>{new Date(receipt.payment_date).toLocaleDateString()}</td></tr>
                    <tr><td>Borrower</td><td>{receipt.full_name} ({receipt.borrower_code})</td></tr>
                    <tr><td>Loan Code</td><td>{receipt.loan_code}</td></tr>
                    <tr><td>Method</td><td>{receipt.payment_method.replace('_', ' ')}</td></tr>
                    {receipt.notes && <tr><td>Notes</td><td>{receipt.notes}</td></tr>}
                    <tr><td className="font-bold">Amount Paid</td><td className="font-bold">৳{money(receipt.amount_paid)}</td></tr>
                  </tbody>
                </table>
              )}
              {preview.kind === 'text' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 rounded-lg p-3 border border-gray-200">{shareText}</pre>
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
