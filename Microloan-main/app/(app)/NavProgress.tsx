'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** A thin coloured bar across the top while a page is loading: starts when you click an in-site link,
 *  finishes when the new page has arrived. Pure polish — it never blocks anything. */
export default function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    function start(e: MouseEvent) {
      const a = (e.target as HTMLElement)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      let url: URL;
      try { url = new URL(a.href, location.href); } catch { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      const el = bar.current;
      if (!el) return;
      el.className = 'nav-progress';
      void el.offsetWidth;
      el.className = 'nav-progress run';
      clearTimeout(timer.current);
      timer.current = setTimeout(finish, 12000); // never leave it hanging
    }
    function finish() {
      const el = bar.current;
      if (!el) return;
      el.className = 'nav-progress done';
      timer.current = setTimeout(() => { if (bar.current) bar.current.className = 'nav-progress'; }, 700);
    }
    document.addEventListener('click', start, true);
    (window as any).__navDone = finish;
    return () => { document.removeEventListener('click', start, true); clearTimeout(timer.current); };
  }, []);

  // a new page arrived -> finish the bar
  useEffect(() => { (window as any).__navDone?.(); }, [pathname, search]);

  return <div ref={bar} className="nav-progress" aria-hidden="true" />;
}
