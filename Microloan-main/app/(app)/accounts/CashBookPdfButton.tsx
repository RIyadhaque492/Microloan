'use client';

import { useState } from 'react';
import { downloadBlob, buildCashBookPdfBlob } from '@/lib/clientExport';

/** Saves the cash book exactly as shown (same period, filters and order) as a PDF with your header and footer. */
export default function CashBookPdfButton({ rows, summary }: { rows: any[]; summary: any }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const blob = await buildCashBookPdfBlob(rows, summary);
      downloadBlob(blob, `Cash-Book-${new Date().toLocaleDateString('en-CA')}.pdf`);
    } catch (e: any) {
      setError(e?.message ? `Could not make the PDF: ${e.message}` : 'Could not make the PDF.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" className="btn btn-outline" disabled={busy} onClick={download}>{busy ? 'Preparing…' : '📄 PDF'}</button>
      {error && <span className="text-xs text-red-600 mt-1 max-w-xs">{error}</span>}
    </span>
  );
}
