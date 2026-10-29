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

type Contact = { id: number; name: string; telegram_chat_id: string; email: string };
type DirectCfg = { telegram: boolean; gmail: boolean; defaultChat: boolean; contacts: Contact[] };
const NO_CFG: DirectCfg = { telegram: false, gmail: false, defaultChat: false, contacts: [] };

let configCache: Promise<DirectCfg> | null = null;
/** Which direct-send services the server has settings for, and the saved contacts (asked on every menu open). */
function directConfig(fresh = false): Promise<DirectCfg> {
  if (!configCache || fresh) {
    configCache = fetch('/api/send-file', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : NO_CFG))
      .then((j) => ({ ...NO_CFG, ...j }))
      .catch(() => NO_CFG);
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
  const [picker, setPicker] = useState<null | { kind: 'telegram' | 'gmail'; contacts: Contact[]; defaultChat: boolean; resolve: (v: { chatIds: string[]; emails: string; names: string; withDefault: boolean } | null) => void }>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState('');
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
    directConfig(true); // warm up (also reloads the contact list)
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

  /** Lets the admin tick one or many saved contacts (and type extra e-mails). Resolves null if cancelled. */
  function askRecipients(kind: 'telegram' | 'gmail', cfg: DirectCfg) {
    const contacts = cfg.contacts.filter((c) => (kind === 'telegram' ? c.telegram_chat_id : c.email));
    let saved: string[] = [];
    try { saved = JSON.parse(localStorage.getItem(`microloan_share_sel_${kind}`) || '[]'); } catch {}
    const valid = new Set<string>([...contacts.map((c) => String(c.id)), ...(kind === 'telegram' && cfg.defaultChat ? ['default'] : [])]);
    let start = saved.filter((x) => valid.has(x));
    if (start.length === 0 && valid.size === 1) start = Array.from(valid);
    setSel(new Set(start));
    setExtra('');
    return new Promise<{ chatIds: string[]; emails: string; names: string; withDefault: boolean } | null>((resolve) =>
      setPicker({ kind, contacts, defaultChat: kind === 'telegram' && cfg.defaultChat, resolve })
    );
  }

  function finishPicker(ok: boolean) {
    if (!picker) return;
    if (!ok) { picker.resolve(null); setPicker(null); return; }
    const chosen = picker.contacts.filter((c) => sel.has(String(c.id)));
    const extraList = extra.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);
    if (picker.kind === 'gmail' && extraList.some((x) => !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(x))) { showNote('One of the typed email addresses is not valid.', true); return; }
    const chatIds = picker.kind === 'telegram' ? chosen.map((c) => c.telegram_chat_id) : [];
    const emails = picker.kind === 'gmail' ? [...chosen.map((c) => c.email), ...extraList].join(',') : '';
    const count = picker.kind === 'telegram' ? chatIds.length + (sel.has('default') ? 1 : 0) : emails ? emails.split(',').length : 0;
    if (count === 0) { showNote('Tick at least one contact.', true); return; }
    try { localStorage.setItem(`microloan_share_sel_${picker.kind}`, JSON.stringify(Array.from(sel))); } catch {}
    picker.resolve({ chatIds, emails, names: String(count), withDefault: picker.kind === 'telegram' && sel.has('default') });
    setPicker(null);
  }

  /** Telegram / Gmail on a computer: the server sends the file itself to every ticked contact — nothing is downloaded. */
  async function sendDirect(kind: 'telegram' | 'gmail', cfg: DirectCfg): Promise<'sent' | 'failed' | 'fallback'> {
    const hasList = cfg.contacts.some((c) => (kind === 'telegram' ? c.telegram_chat_id : c.email));
    let chatIds: string[] = [];
    let emails = '';
    let count = 1;
    let withDefault = kind === 'telegram' && !hasList;
    if (kind === 'telegram' && !hasList) {
      if (!cfg.defaultChat) return 'fallback';
    } else {
      const r = await askRecipients(kind, cfg);
      if (!r) return 'failed';
      chatIds = r.chatIds; emails = r.emails; count = Number(r.names) || 1; withDefault = r.withDefault;
    }
    setBusy(kind);
    try {
      const { blob, filename } = await currentFile();
      const fd = new FormData();
      fd.set('file', new File([blob], filename, { type: blob.type || 'application/octet-stream' }));
      fd.set('kind', kind);
      fd.set('to', emails);
      fd.set('chat_ids', JSON.stringify(chatIds));
      fd.set('with_default', withDefault ? '1' : '');
      fd.set('title', title);
      const res = await fetch('/api/send-file', { method: 'POST', body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        const bad = Array.isArray(json.failed) ? json.failed.length : 0;
        showNote(
          bad
            ? `⚠ PDF sent to ${json.sent}, but ${bad} failed: ${json.failed[0]}`
            : `✅ PDF sent to ${json.sent ?? count} ${kind === 'telegram' ? 'Telegram chat' : 'email address'}${(json.sent ?? count) > 1 ? (kind === 'telegram' ? 's' : 'es') : ''}.`,
          !!bad
        );
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
      const r = await sendDirect(kind, cfg);
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

      {picker && (
        <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center px-4" onClick={() => finishPicker(false)}>
          <div className="modal-in bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy mb-0.5">{picker.kind === 'telegram' ? '✈️ Send on Telegram' : '✉️ Send by email'}</h3>
            <p className="text-xs text-gray-500 mb-3">Tick one or many people. The PDF itself is sent to each — no link, no download.</p>
            <div className="overflow-y-auto -mx-1 px-1 flex-1 min-h-[3rem]">
              {(picker.contacts.length > 1 || (picker.contacts.length > 0 && picker.defaultChat)) && (
                <label className="flex items-center gap-2 py-1.5 text-sm font-semibold text-navy cursor-pointer">
                  <input type="checkbox"
                    checked={sel.size === picker.contacts.length + (picker.defaultChat ? 1 : 0)}
                    onChange={(e) => setSel(e.target.checked ? new Set([...picker.contacts.map((c) => String(c.id)), ...(picker.defaultChat ? ['default'] : [])]) : new Set())} />
                  Select all
                </label>
              )}
              {picker.defaultChat && (
                <label className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={sel.has('default')} onChange={(e) => setSel((p) => { const n = new Set(p); e.target.checked ? n.add('default') : n.delete('default'); return n; })} />
                  <span>My own chat <span className="text-gray-400 text-xs">(Share Settings)</span></span>
                </label>
              )}
              {picker.contacts.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={sel.has(String(c.id))} onChange={(e) => setSel((p) => { const n = new Set(p); e.target.checked ? n.add(String(c.id)) : n.delete(String(c.id)); return n; })} />
                  <span>{c.name} <span className="text-gray-400 text-xs">{picker.kind === 'gmail' ? c.email : c.telegram_chat_id}</span></span>
                </label>
              ))}
              {picker.contacts.length === 0 && !picker.defaultChat && <p className="text-sm text-gray-500 py-2">No saved contacts yet — add them in Share Settings.</p>}
            </div>
            {picker.kind === 'gmail' && (
              <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Other emails (comma separated)" className="input mt-3" />
            )}
            <div className="flex justify-between items-center gap-2 mt-4">
              <a href="/share-settings" className="text-xs text-teal-700 underline">Manage contacts</a>
              <div className="flex gap-2">
                <button type="button" className="btn btn-outline" onClick={() => finishPicker(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => finishPicker(true)}>
                  Send{sel.size + extra.split(/[,;\s]+/).filter(Boolean).length > 0 ? ` (${sel.size + extra.split(/[,;\s]+/).filter(Boolean).length})` : ''}
                </button>
              </div>
            </div>
          </div>
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
