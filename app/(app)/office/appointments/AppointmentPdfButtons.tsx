'use client';

import { useState } from 'react';
import ShareMenu from '@/app/(app)/ShareMenu';
import { downloadBlob, buildAppointmentLetterPdfBlob } from '@/lib/clientExport';

/** "📄 PDF" (download, kept as proof) and "Share" for one appointment letter. */
export default function AppointmentPdfButtons({ letter }: { letter: any }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const safe = String(letter.employee_name || 'Employee').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Employee';
  const fileName = `Appointment-Letter-${safe}.pdf`;
  async function download() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      downloadBlob(await buildAppointmentLetterPdfBlob(letter), fileName);
    } catch (e: any) {
      setError(e?.message ? `Could not make the PDF: ${e.message}` : 'Could not make the PDF.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-start gap-1.5">
      <span className="inline-flex flex-col items-start">
        <button type="button" className="btn btn-primary !py-1 !px-2 text-xs" disabled={busy} onClick={download}>{busy ? '…' : '📄 PDF'}</button>
        {error && <span className="text-[10px] text-red-600 mt-1 max-w-[12rem] whitespace-normal">{error}</span>}
      </span>
      <ShareMenu className="btn btn-outline !py-1 !px-2 text-xs" title={`Appointment letter — ${letter.employee_name}`} getFile={async () => ({ blob: await buildAppointmentLetterPdfBlob(letter), filename: fileName })} />
    </span>
  );
}
