'use client';

import { useEffect } from 'react';

/** Every Remove / Delete button (class "confirm-delete") asks for the admin password first.
 *  The password is sent with the form and checked on the server. */
export default function ConfirmDeleteHandler() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement)?.closest('.confirm-delete');
      if (!target) return;
      const form = target.closest('form');
      const label = target.textContent?.replace(/[🗑✔]/g, '').trim() || 'this item';
      const pin = window.prompt(`Enter admin password to ${label.toLowerCase().startsWith('remove') ? label.toLowerCase() : 'delete ' + label}:`);
      if (!pin || !form) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      let input = form.querySelector<HTMLInputElement>('input[name="delete_pin"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'delete_pin';
        form.appendChild(input);
      }
      input.value = pin;
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
