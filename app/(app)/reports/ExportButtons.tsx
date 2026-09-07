'use client';

import { useState } from 'react';
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

export default function ExportButtons(props: Props) {
  const [busy, setBusy] = useState<null | 'pdf' | 'excel'>(null);
  const [copied, setCopied] = useState(false);

  async function handlePdf() {
    setBusy('pdf');
    try {
      const blob =
        props.mode === 'single'
          ? await buildSingleUserPdfBlob(props.borrower, props.loans, props.payments)
          : await buildAllUsersPdfBlob(props.rows);
      const filename = props.mode === 'single' ? `borrower-${props.borrower.borrower_code}.pdf` : `all-borrowers-report.pdf`;
      await shareOrDownloadBlob(blob, filename, 'application/pdf');
    } finally {
      setBusy(null);
    }
  }

  async function handleExcel() {
    setBusy('excel');
    try {
      const blob =
        props.mode === 'single'
          ? await buildSingleUserExcelBlob(props.borrower, props.loans, props.payments)
          : await buildAllUsersExcelBlob(props.rows);
      const filename = props.mode === 'single' ? `borrower-${props.borrower.borrower_code}.xlsx` : `all-borrowers-report.xlsx`;
      await shareOrDownloadBlob(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } finally {
      setBusy(null);
    }
  }

  async function handleTextShare() {
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title: 'MicroLoan Report', text: props.shareText });
        return;
      } catch {
        return; // user cancelled
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(props.shareText)}`, '_blank');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(props.shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <button onClick={handlePdf} disabled={busy === 'pdf'} type="button" className="btn btn-outline">
        {busy === 'pdf' ? 'Preparing…' : '📄 PDF'}
      </button>
      <button onClick={handleExcel} disabled={busy === 'excel'} type="button" className="btn btn-outline">
        {busy === 'excel' ? 'Preparing…' : '📊 Excel'}
      </button>
      <button onClick={handleTextShare} type="button" className="btn btn-outline">
        💬 Share Text
      </button>
      <button onClick={handleCopy} type="button" className="btn btn-outline">
        {copied ? '✅ Copied' : '📋 Copy'}
      </button>
    </div>
  );
}
