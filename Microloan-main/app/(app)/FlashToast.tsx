'use client';

import { useEffect, useRef, useState } from 'react';

type Toast = { id: number; m: string; t: 'success' | 'error' | 'info' };

function decodeFlash(raw: string): any | null {
  // The cookie can be URL-encoded more than once on its way here — decode until it parses.
  let v = raw;
  for (let i = 0; i < 3; i++) {
    try { return JSON.parse(v); } catch {}
    try { v = decodeURIComponent(v); } catch { return null; }
  }
  return null;
}

function readFlash(): Toast | null {
  const hit = document.cookie.split('; ').find((c) => c.startsWith('flash='));
  if (!hit) return null;
  document.cookie = 'flash=; Max-Age=0; path=/';
  const o = decodeFlash(hit.slice(6));
  if (!o || !o.m) return null;
  return { id: Number(o.id) || Date.now(), m: String(o.m), t: o.t === 'error' || o.t === 'info' ? o.t : 'success' };
}

/**
 * Pop-up messages for every action: "Saved", "Payment collected", "Deleted"...
 * The server leaves a short-lived message cookie before it redirects; this shows it as a toast and clears it.
 * Any ?error=... message in the address also pops up in red.
 */
export default function FlashToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastError = useRef('');

  useEffect(() => {
    function push(t: Toast) {
      setToasts((list) => (list.some((x) => x.id === t.id && x.m === t.m) ? list : [...list.slice(-2), t]));
      setTimeout(() => setToasts((list) => list.filter((x) => x !== t && !(x.id === t.id && x.m === t.m))), t.t === 'error' ? 5500 : 3800);
    }
    function check() {
      const t = readFlash();
      if (t) push(t);
      const err = new URLSearchParams(window.location.search).get('error') || '';
      if (err && err !== lastError.current && !err.startsWith('Wrong password')) {
        push({ id: Date.now(), m: err, t: 'error' });
      }
      lastError.current = err;
    }
    check();
    const timer = setInterval(check, 350);
    return () => clearInterval(timer);
  }, []);

  if (!toasts.length) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-[400] flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <button
          key={`${t.id}-${t.m}`}
          type="button"
          onClick={() => setToasts((list) => list.filter((x) => x !== t))}
          className={`toast-in pointer-events-auto text-left rounded-xl shadow-lg px-4 py-3 text-sm font-semibold text-white flex items-start gap-2 ${
            t.t === 'error' ? 'bg-red-600' : t.t === 'info' ? 'bg-navy' : 'bg-green-600'
          }`}
        >
          <span className="text-base leading-none">{t.t === 'error' ? '⚠️' : t.t === 'info' ? 'ℹ️' : '✅'}</span>
          <span className="flex-1">{t.m}</span>
        </button>
      ))}
    </div>
  );
}
