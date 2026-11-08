'use client';

import { useEffect, useRef, useState } from 'react';

function isoToDmy(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function dmyToIso(text: string) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!m) return '';
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function mask(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += '-' + digits.slice(2, 4);
  if (digits.length > 4) out += '-' + digits.slice(4);
  return out;
}

/**
 * Date field that always shows and accepts dd-mm-yyyy (the browser's own date box follows the computer's
 * language). Type digits (dashes are added for you) or tap 📅 for the calendar. The form receives the
 * date as yyyy-mm-dd under `name`, exactly like a normal date input, so nothing else changes.
 */
export default function DateInput({
  name,
  value,
  defaultValue,
  onChange,
  className = 'input',
  required,
  ariaLabel,
}: {
  name?: string;
  value?: string; // controlled (yyyy-mm-dd)
  defaultValue?: string; // uncontrolled (yyyy-mm-dd)
  onChange?: (iso: string) => void;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
}) {
  const controlled = value !== undefined;
  const [text, setText] = useState(isoToDmy((controlled ? value : defaultValue) || ''));
  const picker = useRef<HTMLInputElement>(null);
  const visible = useRef<HTMLInputElement>(null);
  const iso = dmyToIso(text);

  // Follow outside changes (e.g. maturity date worked out automatically).
  useEffect(() => {
    if (controlled && (value || '') !== iso) setText(isoToDmy(value || ''));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    visible.current?.setCustomValidity(text && !iso ? 'Enter a valid date as dd-mm-yyyy' : '');
  }, [text, iso]);

  function handleText(raw: string) {
    const next = mask(raw);
    setText(next);
    const nextIso = dmyToIso(next);
    if (nextIso || next === '') onChange?.(nextIso);
  }

  function openPicker() {
    const el = picker.current as any;
    if (!el) return;
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.click();
  }

  const hasWidth = /(^|\s)w-\S+/.test(className);

  return (
    <div className={hasWidth ? 'relative inline-block align-bottom' : 'relative block'}>
      <input
        ref={visible}
        type="text"
        inputMode="numeric"
        placeholder="dd-mm-yyyy"
        maxLength={10}
        value={text}
        onChange={(e) => handleText(e.target.value)}
        className={className}
        required={required}
        aria-label={ariaLabel}
        autoComplete="off"
      />
      {name && <input type="hidden" name={name} value={iso} />}
      <button type="button" tabIndex={-1} onClick={openPicker} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-base leading-none opacity-70 hover:opacity-100" aria-label="Open calendar">📅</button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={iso}
        onChange={(e) => {
          setText(isoToDmy(e.target.value));
          onChange?.(e.target.value);
        }}
        className="absolute right-0 bottom-0 w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
