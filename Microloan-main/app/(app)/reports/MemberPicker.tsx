'use client';

import { useEffect, useRef, useState } from 'react';

type Member = { id: number; borrower_code: string; full_name: string; phone: string };

/** Member search box with suggestions: type an ID, name or phone and pick from the list.
 *  The chosen member's id is sent as `borrower`; the report opens as soon as a suggestion is picked. */
export default function MemberPicker({ members, defaultId }: { members: Member[]; defaultId?: number }) {
  const label = (m: Member) => `${m.borrower_code} — ${m.full_name}`;
  const initial = members.find((m) => m.id === defaultId) || null;
  const [text, setText] = useState(initial ? label(initial) : '');
  const hidden = useRef<HTMLInputElement>(null);

  const exact = members.find((m) => label(m) === text) || null;
  const q = text.trim().toLowerCase();
  const partial = !exact && q ? members.filter((m) => label(m).toLowerCase().includes(q) || (m.phone || '').includes(q)) : [];
  const chosen = exact || (partial.length === 1 ? partial[0] : null);

  // Open the report right after an exact suggestion is picked.
  useEffect(() => {
    if (exact && exact.id !== defaultId) hidden.current?.form?.requestSubmit();
  }, [exact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 min-w-[240px]">
      <label className="label">Search member <span className="text-gray-400 font-normal">(ID, name or phone)</span></label>
      <input
        list="report-member-suggestions"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="input"
        placeholder="e.g. 108 — Mukesh Ambani"
        autoComplete="off"
      />
      <datalist id="report-member-suggestions">
        {members.map((m) => <option key={m.id} value={label(m)}>{m.phone}</option>)}
      </datalist>
      <input ref={hidden} type="hidden" name="borrower" value={chosen?.id ?? ''} />
      {text && !chosen && (
        <p className="text-xs text-amber-600 mt-1">{partial.length > 1 ? `${partial.length} matches — pick one from the suggestions.` : 'No member found — pick from the suggestions.'}</p>
      )}
    </div>
  );
}
