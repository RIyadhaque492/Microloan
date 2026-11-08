'use client';

import { useState } from 'react';

/** Logout that always works: clears the session cookie, then does a full page load of /login
 *  (so no cached page of the old session can be shown with the Back button). */
export default function LogoutButton({ className = '' }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch('/api/logout', { method: 'POST', cache: 'no-store', credentials: 'same-origin' });
    } catch {
      /* even if the request fails, go to the login page */
    }
    try { sessionStorage.clear(); } catch {}
    window.location.replace('/login');
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className={`logout-btn w-full flex items-center justify-center gap-2 rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 hover:text-white active:scale-[.98] disabled:opacity-60 ${className}`}
    >
      <span aria-hidden>{busy ? '⏳' : '⎋'}</span>
      {busy ? 'Logging out…' : 'Logout'}
    </button>
  );
}
