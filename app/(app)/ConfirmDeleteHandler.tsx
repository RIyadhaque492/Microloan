'use client';

import { useEffect } from 'react';

export default function ConfirmDeleteHandler() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('.confirm-delete');
      if (!target) return;
      const label = target.textContent?.replace(/[🗑✔]/g, '').trim() || 'this item';
      if (!window.confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
