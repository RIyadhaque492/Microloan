'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Keeps keyboard focus on the page content (not the sidebar) so arrow keys / PageUp / PageDown
 *  scroll the page itself, including after every navigation. */
export default function MainFocus() {
  const pathname = usePathname();
  useEffect(() => {
    document.getElementById('main-scroll')?.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
