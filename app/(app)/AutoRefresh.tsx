'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const EVERY_MS = 30000;
/** Read-only pages that are safe to refresh in the background. Forms, settings, backup/restore are never touched. */
const SAFE = /^\/(dashboard|borrowers|loans|collections|savings|reports|notifications|bin)\/?$/;

/** True when refreshing now could disturb the person (typing, a dialog/menu is open, a file is being made, text is selected). */
function userIsBusy() {
  const el = document.activeElement as HTMLElement | null;
  if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && (el as HTMLInputElement).type !== 'checkbox') return true;
  if (document.querySelector('[role=menu], [role=dialog], [data-no-refresh]')) return true;
  if (document.querySelector('.fixed.inset-0')) return true;
  if (Array.from(document.querySelectorAll('button[disabled]')).some((b) => /…$|\.\.\.$/.test((b.textContent || '').trim()))) return true;
  const sel = window.getSelection?.();
  if (sel && !sel.isCollapsed && String(sel).length > 0) return true;
  return false;
}

/** Sidebar switch + the timer: quietly re-loads the data of the current page every 30 s and when you return to the tab. */
export default function AutoRefreshToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const [on, setOn] = useState(true);
  const [spin, setSpin] = useState(false);
  const last = useRef(Date.now());

  useEffect(() => {
    try { if (localStorage.getItem('microloan_autorefresh') === 'off') setOn(false); } catch {}
  }, []);

  useEffect(() => {
    if (!on || !SAFE.test(pathname)) return;
    const tick = (force = false) => {
      if (document.hidden) return;
      if (!force && Date.now() - last.current < EVERY_MS - 500) return;
      if (userIsBusy()) return;
      last.current = Date.now();
      setSpin(true);
      router.refresh();
      setTimeout(() => setSpin(false), 900);
    };
    const id = setInterval(() => tick(), EVERY_MS);
    const onVisible = () => { if (!document.hidden && Date.now() - last.current > 10000) tick(true); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [on, pathname, router]);

  function toggle() {
    const n = !on;
    setOn(n);
    try { localStorage.setItem('microloan_autorefresh', n ? 'on' : 'off'); } catch {}
  }

  const applies = SAFE.test(pathname);
  return (
    <button
      type="button"
      onClick={toggle}
      title={applies ? 'Reloads this page’s data every 30 seconds (never while you are typing)' : 'Auto refresh is paused on forms and settings pages'}
      className="w-full flex items-center justify-between rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs text-gray-200 transition"
    >
      <span className="flex items-center gap-2">
        <span className={spin ? 'inline-block animate-spin' : 'inline-block'} aria-hidden>🔄</span>
        Auto refresh
      </span>
      <span className={`rounded-full px-2 py-0.5 font-semibold ${on ? 'bg-emerald-500/30 text-emerald-200' : 'bg-gray-500/30 text-gray-300'}`}>{on ? (applies ? 'ON' : 'ON · paused') : 'OFF'}</span>
    </button>
  );
}
