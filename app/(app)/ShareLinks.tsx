'use client';

import { useState } from 'react';

/**
 * Quick-share row for a generated file. Each button first makes a private link (valid 48 hours) and then opens
 * Telegram / WhatsApp / Messenger / Email with that link ready to send. (The phone's own share sheet is
 * still available through the main Share button, which attaches the real file.)
 */
type Kind = 'telegram' | 'whatsapp' | 'messenger' | 'gmail' | 'copy';

export default function ShareLinks({
  getFile,
  title,
  only,
  bare = false,
}: {
  getFile: () => Promise<{ blob: Blob; filename: string }>;
  title: string;
  only?: Kind[]; // show just these buttons
  bare?: boolean; // plain toolbar buttons (no box, no note)
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');

  async function makeLink(): Promise<string> {
    if (link) return link;
    const { blob, filename } = await getFile();
    const fd = new FormData();
    fd.set('file', new File([blob], filename, { type: blob.type || 'application/octet-stream' }));
    const res = await fetch('/api/share-file', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) throw new Error(json.error || 'Could not create the link.');
    setLink(json.url);
    return json.url as string;
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  async function go(kind: Kind) {
    setNote('');
    setBusy(kind);
    // Open the tab right away (inside the click) so the browser doesn't block it while the link is being made.
    const tab = kind === 'telegram' || kind === 'whatsapp' ? window.open('', '_blank') : null;
    try {
      const url = await makeLink();
      const text = `${title} — link valid for 48 hours`;
      const enc = encodeURIComponent;
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (kind === 'telegram') {
        const target = `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
        if (tab) tab.location.href = target; else window.open(target, '_blank');
      } else if (kind === 'whatsapp') {
        const target = `https://wa.me/?text=${enc(`${text}\n${url}`)}`;
        if (tab) tab.location.href = target; else window.open(target, '_blank');
      } else if (kind === 'gmail') {
        // Desktop: Gmail's own compose window. Phone: the mail app (usually Gmail).
        if (mobile) window.location.href = `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`;
        else window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`, '_blank');
      } else if (kind === 'messenger') {
        if (mobile) {
          window.location.href = `fb-messenger://share/?link=${enc(url)}`;
        } else {
          const ok = await copy(url);
          setNote(ok ? 'Link copied — paste it in Messenger.' : url);
          window.open('https://www.messenger.com/', '_blank');
        }
      } else {
        const ok = await copy(url);
        setNote(ok ? 'Link copied.' : url);
      }
    } catch (e: any) {
      tab?.close();
      setNote(e?.message || 'Could not create the link.');
    } finally {
      setBusy(null);
    }
  }

  const show = (k: Kind) => !only || only.includes(k);
  const chip = bare ? 'btn btn-outline disabled:opacity-50' : 'px-3 py-1.5 rounded-full border text-xs font-semibold disabled:opacity-50';
  const c = (cls: string) => (bare ? chip : `${chip} ${cls}`);

  const buttons = (
    <>
      {show('telegram') && <button type="button" disabled={!!busy} onClick={() => go('telegram')} className={c('border-sky-300 bg-sky-50 text-sky-700')}>{busy === 'telegram' ? '…' : '✈️ Telegram'}</button>}
      {show('messenger') && <button type="button" disabled={!!busy} onClick={() => go('messenger')} className={c('border-blue-300 bg-blue-50 text-blue-700')}>💬 Messenger</button>}
      {show('whatsapp') && <button type="button" disabled={!!busy} onClick={() => go('whatsapp')} className={c('border-green-300 bg-green-50 text-green-700')}>🟢 WhatsApp</button>}
      {show('gmail') && <button type="button" disabled={!!busy} onClick={() => go('gmail')} className={c('border-red-300 bg-red-50 text-red-700')}>{busy === 'gmail' ? '…' : '✉️ Gmail'}</button>}
      {show('copy') && <button type="button" disabled={!!busy} onClick={() => go('copy')} className={c('border-gray-300 bg-white text-gray-700')}>🔗 Copy link</button>}
    </>
  );

  if (bare) {
    return (
      <>
        {buttons}
        {note && <span className="text-xs text-red-600 self-center">{note}</span>}
      </>
    );
  }

  return (
    <div className="px-4 py-2 border-b border-gray-100 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-gray-500 mr-1">Send via:</span>
        {buttons}
        {busy && <span className="text-[11px] text-gray-500">Preparing link…</span>}
      </div>
      {note && <p className="text-[11px] text-teal-700 mt-1 break-all">{note}</p>}
      {!note && <p className="text-[10px] text-gray-400 mt-1">The link opens the file for 48 hours — anyone with the link can view it.</p>}
    </div>
  );
}
