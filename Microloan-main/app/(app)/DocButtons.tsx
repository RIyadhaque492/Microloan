'use client';

import { useState } from 'react';
import { downloadBlob, buildMembershipPdfBlob, buildLoanApplicationPdfBlob } from '@/lib/clientExport';

function safeName(s: string) {
  return String(s || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Builds the PDF in the browser and saves it straight to the device — no preview, no share sheet. */
function useDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(make: () => Promise<{ blob: Blob; filename: string }>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const { blob, filename } = await make();
      downloadBlob(blob, filename);
    } catch (e: any) {
      setError(e?.message ? `Could not make the PDF: ${e.message}` : 'Could not make the PDF.');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run };
}

export function MembershipPdfButton({ member }: { member: any }) {
  const { busy, error, run } = useDownload();
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className="btn btn-outline"
        disabled={busy}
        onClick={() => run(async () => ({ blob: await buildMembershipPdfBlob(member), filename: `Membership-${safeName(member.borrower_code)}-${safeName(member.full_name)}.pdf` }))}
      >
        {busy ? 'Preparing…' : '📄 Membership PDF'}
      </button>
      {error && <span className="text-xs text-red-600 mt-1 max-w-xs">{error}</span>}
    </span>
  );
}

export function LoanApplicationPdfButton({ loan, member, installments }: { loan: any; member: any; installments: any[] }) {
  const { busy, error, run } = useDownload();
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        className="btn btn-outline"
        disabled={busy}
        onClick={() => run(async () => ({ blob: await buildLoanApplicationPdfBlob(loan, member, installments), filename: `Loan-Application-${safeName(loan.loan_code)}-${safeName(loan.full_name)}.pdf` }))}
      >
        {busy ? 'Preparing…' : '📄 Loan Application PDF'}
      </button>
      {error && <span className="text-xs text-red-600 mt-1 max-w-xs">{error}</span>}
    </span>
  );
}
