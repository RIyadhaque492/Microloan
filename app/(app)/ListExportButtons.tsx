'use client';

import { useState } from 'react';
import ShareMenu from './ShareMenu';
import { downloadBlob, buildListPdfBlob } from '@/lib/clientExport';

type Opts = Parameters<typeof buildListPdfBlob>[0];

/** "📄 PDF" + "Share" for a list page (All Members, All Loans): the list exactly as filtered and ordered on screen. */
export default function ListExportButtons({ opts, filename, shareTitle }: { opts: Opts; filename: string; shareTitle: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      downloadBlob(await buildListPdfBlob(opts), filename);
    } catch (e: any) {
      setError(e?.message ? `Could not make the PDF: ${e.message}` : 'Could not make the PDF.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex items-start gap-2 flex-wrap">
      <span className="inline-flex flex-col items-start">
        <button type="button" className="btn btn-outline" disabled={busy} onClick={download}>{busy ? 'Preparing…' : '📄 PDF'}</button>
        {error && <span className="text-xs text-red-600 mt-1 max-w-xs">{error}</span>}
      </span>
      <ShareMenu title={shareTitle} getFile={async () => ({ blob: await buildListPdfBlob(opts), filename })} />
    </span>
  );
}
