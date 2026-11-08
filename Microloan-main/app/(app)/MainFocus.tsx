'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function isScrollable(el: HTMLElement) {
  const oy = getComputedStyle(el).overflowY;
  return (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
}

/** Nearest scrollable ancestor of an element (inside the page content, never the sidebar). */
function scrollableAncestor(start: Element | null, root: HTMLElement): HTMLElement | null {
  let el = start as HTMLElement | null;
  while (el && el !== document.body) {
    if (el.tagName === 'ASIDE') return null; // sidebar keeps its own scrolling
    if (isScrollable(el)) return el;
    el = el.parentElement;
  }
  return isScrollable(root) ? root : null;
}

/**
 * Keyboard scrolling for the whole app:
 *  - focus goes to the page content after every navigation, and
 *  - Arrow Up/Down, Page Up/Down, Home/End scroll the page (or the table under the mouse) even when
 *    focus is on the sidebar or nowhere, and also on list pages where only the table scrolls.
 */
export default function MainFocus() {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById('main-scroll')?.focus({ preventScroll: true });
  }, [pathname]);

  useEffect(() => {
    let px = -1;
    let py = -1;
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const keys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'];
      if (!keys.includes(e.key)) return;

      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;

      const main = document.getElementById('main-scroll');
      if (!main) return;

      // Pointer over a sidebar that really scrolls? leave its native scrolling alone.
      const under = px >= 0 ? document.elementFromPoint(px, py) : null;
      const side = under?.closest('aside') as HTMLElement | null;
      if (side && isScrollable(side)) return;

      let target = scrollableAncestor(under, main);
      if (!target) {
        // Nothing scrollable under the pointer: use the page, or the biggest scrolling table on list pages.
        target = isScrollable(main) ? main : null;
        if (!target) {
          const candidates = Array.from(main.querySelectorAll<HTMLElement>('*')).filter(isScrollable);
          candidates.sort((a, b) => b.clientHeight - a.clientHeight);
          target = candidates[0] || null;
        }
      }
      if (!target) return;

      e.preventDefault();
      const page = target.clientHeight * 0.9;
      if (e.key === 'ArrowDown') target.scrollBy({ top: 60 });
      else if (e.key === 'ArrowUp') target.scrollBy({ top: -60 });
      else if (e.key === 'PageDown') target.scrollBy({ top: page });
      else if (e.key === 'PageUp') target.scrollBy({ top: -page });
      else if (e.key === 'Home') target.scrollTo({ top: 0 });
      else if (e.key === 'End') target.scrollTo({ top: target.scrollHeight });
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onMove);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return null;
}
