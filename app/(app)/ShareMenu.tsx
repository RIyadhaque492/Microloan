'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadBlob } from '@/lib/clientExport';

/**
 * "Share" button with a dropdown: Telegram, Gmail, Messenger, WhatsApp, More apps…
 *  • Telegram / Gmail with direct send set up (Share Settings page): the server sends the PDF itself — no window, no download.
 *  • Phones/tablets: the share sheet opens with the PDF attached.
 *  • Computer otherwise: the chosen app opens (installed app via tg:// whatsapp:// etc.) and the PDF is saved, ready to drop in (a website cannot
 *    attach a file to another site by itself). "More apps…" opens the system share window with the PDF attached.
 */
export type ShareKind = 'telegram' | 'gmail' | 'messenger' | 'whatsapp' | 'system';

const APPS: { kind: ShareKind; label: string; icon: string; cls: string }[] = [
  { kind: 'telegram', label: 'Telegram', icon: '✈️', cls: 'hover:bg-sky-50 text-sky-700' },
  { kind: 'gmail', label: 'Gmail', icon: '✉️', cls: 'hover:bg-red-50 text-red-700' },
  { kind: 'messenger', label: 'Messenger', icon: '💬', cls: 'hover:bg-blue-50 text-blue-700' },
  { kind: 'whatsapp', label: 'WhatsApp', icon: '🟢', cls: 'hover:bg-green-50 text-green-700' },
  { kind: 'system', label: 'More apps…', icon: '📲', cls: 'hover:bg-gray-50 text-gray-700 border-t border-gray-100' },
];

/** Never wait forever for the file to be made. */
function withTimeout<T>(p: Promise<T>, ms = 60000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Preparing the file took too long — please try again.')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

let configCache: Promise<{ telegram: boolean; gmail: boolean }> | null = null;
/** Which direct-send services the server has settings for (asked once per page). */
function directConfig(): Promise<{ telegram: boolean; gmail: boolean }> {
  if (!configCache) {
    configCache = fetch('/api/send-file', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { telegram: false, gmail: false }))
      .catch(() => ({ telegram: false, gmail: false }));
  }
  return configCache;
}

function isMobileDevice() {
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}

/** Opens the installed desktop app (Telegram Desktop, WhatsApp, Messenger, the default mail app). */
export function appLink(kind: ShareKind, subject: string, link = ''): string {
  const enc = encodeURIComponent;
  const msg = link ? `${subject}\n${link}` : subject;
  switch (kind) {
    case 'telegram': return link ? `tg://msg_url?url=${enc(link)}&text=${enc(subject)}` : 'tg://';
    case 'whatsapp': return link ? `whatsapp://send?text=${enc(msg)}` : 'whatsapp://send';
    case 'messenger': return link ? `fb-messenger://share/?link=${enc(link)}` : 'fb-messenger://';
    case 'gmail': return `mailto:?subject=${enc(subject)}${link ? `&body=${enc(msg)}` : ''}`;
    default: return '';
  }
}

/** Website version of each app with the PDF link filled in (used when the desktop app is not installed). */
export function webLink(kind: ShareKind, subject: string, link: string): string {
  const enc = encodeURIComponent;
  switch (kind) {
    case 'telegram': return `https://t.me/share/url?url=${enc(link)}&text=${enc(subject)}`;
    case 'whatsapp': return `https://wa.me/?text=${enc(`${subject}\n${link}`)}`;
    case 'messenger': return 'https://www.messenger.com/';
    case 'gmail': return `https://mail.google.com/mail/?view=cm&fs=1&su=${enc(subject)}&body=${enc(`${subject}\n${link}`)}`;
    default: return '';
  }
}

/** Stores the file for 48 hours and returns a private link to it. */
async function uploadLink(blob: Blob, filename: string): Promise<string> {
  const fd = new FormData();
  fd.set('file', new File([blob], filename, { type: blob.type || 'application/octet-stream' }));
  const res = await fetch('/api/share-file', { method: 'POST', body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error || 'Could not create the link.');
  return json.url as string;
}

/** Where to go on a computer (and as the fallback on a phone that cannot attach files). */
export function shareTarget(kind: ShareKind, subject: string, mobile: boolean): string {
  const enc = encodeURIComponent;
  switch (kind) {
    case 'telegram':
      return mobile ? 'https://t.me/' : 'https://web.telegram.org/a/';
    case 'system':
      return '';
    case 'whatsapp':
      return mobile ? 'https://wa.me/' : 'https://web.whatsapp.com/';
    case 'messenger':
      return 'https://www.messenger.com/';
    case 'gmail':
      return mobile
        ? `mailto:?subject=${enc(subject)}`
        : `https://mail.google.com/mail/?view=cm&fs=1&su=${enc(subject)}`;
  }
}

export default function ShareMenu({
  getFile,
  title,
  label = 'Share',
  className = 'btn btn-outline',
  openUp = false,
}: {
  getFile: () => Promise<{ blob: Blob; filename: string }>;
  title: string;
  label?: string;
  className?: string;
  openUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ShareKind | null>(null);
  const [ready, setReady] = useState<'wait' | 'ok' | 'fail'>('wait');
  const [emailAsk, setEmailAsk] = useState<null | { resolve: (v: string | null) => void }>(null);
  const [emailVal, setEmailVal] = useState('');
  const [note, setNote] = useState<{ text: string; error?: boolean; action?: { label: string; href: string } } | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filePromise = useRef<Promise<{ blob: Blob; filename: string }> | null>(null);
  const noteTimer = useRef<any>(null);

  function showNote(text: string, error = false, action?: { label: string; href: string }) {
    clearTimeout(noteTimer.current);
    setNote({ text, error, action });
    noteTimer.current = setTimeout(() => setNote(null), action ? 20000 : 9000);
  }

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const width = 190;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      const up = openUp || window.innerHeight - r.bottom < 230;
      setPos(up ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 });
    }
    // Make the file now, while the menu is open, so the share sheet can open the instant an app is picked
    // (phones only allow it right after a tap).
    setReady('wait');
    directConfig(); // warm up
    const p = getFile();
    filePromise.current = p;
    p.then(
      () => filePromise.current === p && setReady('ok'),
      (e) => { if (filePromise.current === p) { setReady('fail'); showNote(e?.message ? `Could not prepare the file: ${e.message}` : 'Could not prepare the file.', true); } }
    );
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  useEffect(() => () => clearTimeout(noteTimer.current), []);

  /** The prepared file; makes it again if the earlier attempt failed. */
  function currentFile() {
    if (ready === 'fail' || !filePromise.current) filePromise.current = getFile();
    return withTimeout(filePromise.current);
  }

  /** Asks for the e-mail address to send to (remembered for next time). Resolves null if cancelled. */
  function askEmail(): Promise<string | null> {
    let last = '';
    try { last = localStorage.getItem('microloan_share_email') || ''; } catch {}
    setEmailVal(last);
    return new Promise((resolve) => setEmailAsk({ resolve }));
  }

  /** Telegram / Gmail on a computer: the server sends the file itself — nothing is downloaded or attached by hand. */
  async function sendDirect(kind: 'telegram' | 'gmail'): Promise<'sent' | 'failed' | 'fallback'> {
    let to = '';
    if (kind === 'gmail') {
      const v = await askEmail();
      if (!v) return 'failed';
      to = v;
      try { localStorage.setItem('microloan_share_email', v); } catch {}
    }
    setBusy(kind);
    try {
      const { blob, filename } = await currentFile();
      const fd = new FormData();
      fd.set('file', new File([blob], filename, { type: blob.type || 'application/octet-stream' }));
      fd.set('kind', kind);
      fd.set('to', to);
      fd.set('title', title);
      const res = await fetch('/api/send-file', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        showNote(kind === 'telegram' ? '✅ PDF sent to Telegram.' : `✅ PDF emailed to ${to}.`);
        return 'sent';
      }
      if (json.code === 'not_configured') return 'fallback';
      showNote(json.error || 'Could not send the file.', true);
      return 'failed';
    } catch (e: any) {
      showNote(e?.message ? `Could not send: ${e.message}` : 'Could not send the file.', true);
      return 'failed';
    } finally {
      setBusy(null);
    }
  }

  async function pick(kind: ShareKind) {
    const app = APPS.find((a) => a.kind === kind)!;
    const mobile = isMobileDevice();
    setOpen(false);
    setNote(null);

    const cfg = !mobile && (kind === 'telegram' || kind === 'gmail') ? await directConfig() : null;
    if (cfg && (kind === 'telegram' || kind === 'gmail') && cfg[kind]) {
      const r = await sendDirect(kind);
      if (r !== 'fallback') { filePromise.current = null; return; }
      // not set up on the server yet -> the share window below
    } else if (cfg && kind === 'telegram') {
      showNote('Opening Telegram. To send the PDF straight into Telegram with no attaching, set it up once in “Share Settings” (sidebar).');
    }
    setBusy(kind);

    // Can this browser hand a real file to the system share sheet? (Checked right now, inside the click.)
    const nav = navigator as any;
    let nativeOK = false;
    try {
      nativeOK = !!nav.canShare && !!nav.share && nav.canShare({ files: [new File(['x'], 'probe.pdf', { type: 'application/pdf' })] });
    } catch { nativeOK = false; }

    // Phones: the share sheet with the file attached. Computer: the chosen app opens (Telegram, Gmail, …) with the
    // file saved ready to drop in — unless direct send is set up (handled above), or "More apps…" is chosen.
    const useNative = nativeOK && (mobile || kind === 'system');

    try {
      const { blob, filename } = await currentFile();
      const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });

      if (useNative && nav.canShare({ files: [file] })) {
        try {
          // ONLY the file — a title/text next to it makes some apps (WhatsApp, Telegram) send just that text.
          await nav.share({ files: [file] });
          return; // shared (or the share sheet was used)
        } catch (e: any) {
          if (e?.name === 'AbortError') return; // closed the share sheet — nothing to do
          // any other problem: fall through to download + open the app
        }
      }
      if (kind === 'system') { downloadBlob(blob, filename); showNote(`${filename} saved to your Downloads.`); return; }

      // Computer (or a phone browser that cannot attach files): nothing is downloaded. The PDF is stored for 48 hours
      // behind a private link and the installed APP opens (tg:// whatsapp:// fb-messenger:// mailto:) with that link
      // already in the message. If the app is not installed, the note offers the website version.
      const link = await uploadLink(blob, filename);
      try { await navigator.clipboard.writeText(link); } catch {}
      if (mobile) {
        const w = webLink(kind, title, link);
        if (kind === 'gmail') window.location.href = appLink(kind, title, link); else window.open(w, '_blank');
        showNote(`PDF link ready (valid 48 hours).`);
      } else {
        const a = document.createElement('a');
        a.href = appLink(kind, title, link);
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 500);
        showNote(
          `PDF link added to the message (valid 48 hours) and copied — paste it if needed.`,
          false,
          { label: kind === 'gmail' ? 'Use Gmail website instead' : `${app.label} didn't open? Use the website`, href: webLink(kind, title, link) }
        );
      }
    } catch (e: any) {
      showNote(e?.message ? `Could not prepare the file: ${e.message}` : 'Could not prepare the file.', true);
    } finally {
      setBusy(null);
      filePromise.current = null;
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        disabled={!!busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${className} disabled:opacity-60`}
      >
        {busy ? 'Preparing…' : `📤 ${label} ▾`}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: 190 }}
          className="pop-in z-[300] rounded-xl border border-gray-200 bg-white shadow-xl py-1 text-sm"
        >
          <div className="px-4 pt-1.5 pb-1 text-[11px] text-gray-500 border-b border-gray-100 mb-1">
            {ready === 'wait' ? 'Send the file via: (preparing…)' : ready === 'fail' ? '⚠ File problem — tap to retry' : 'Send the file via:'}
          </div>
          {APPS.map((a) => (
            <button
              key={a.kind}
              type="button"
              role="menuitem"
              onClick={() => pick(a.kind)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left font-semibold ${a.cls}`}
            >
              <span className="text-base leading-none">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {emailAsk && (
        <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center px-4" onClick={() => { emailAsk.resolve(null); setEmailAsk(null); }}>
          <form
            className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const v = emailVal.trim();
              if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(v)) return;
              emailAsk.resolve(v);
              setEmailAsk(null);
            }}
          >
            <h3 className="font-bold text-navy mb-1">✉️ Send by email</h3>
            <p className="text-xs text-gray-500 mb-3">The PDF is attached and sent straight from the server.</p>
            <input type="email" required autoFocus value={emailVal} onChange={(e) => setEmailVal(e.target.value)} placeholder="name@example.com" className="input mb-3" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => { emailAsk.resolve(null); setEmailAsk(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Send</button>
            </div>
          </form>
        </div>
      )}

      {note && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[400] max-w-[92vw] rounded-lg px-4 py-2 text-sm shadow-lg text-white ${note.error ? 'bg-red-600' : 'bg-navy'}`}
          onClick={() => setNote(null)}
        >
          {note.text}
          {note.action && (
            <> <a href={note.action.href} target="_blank" rel="noopener noreferrer" className="underline font-semibold ml-1" onClick={(e) => e.stopPropagation()}>{note.action.label}</a></>
          )}
        </div>
      )}
    </>
  );
}
