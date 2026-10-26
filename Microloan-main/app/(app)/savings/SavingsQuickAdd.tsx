'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { quickSavingsAction } from '@/lib/actions';
import DateInput from '@/app/(app)/DateInput';
import { todayISO } from '@/lib/utils';

type Member = { id: number; borrower_code: string; full_name: string; phone: string };

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn btn-primary disabled:opacity-50">
      {pending ? 'Saving…' : '💾 Save Savings'}
    </button>
  );
}

/** "➕ Savings" button for the Savings list page: pick a member, enter the amount, save — no need to open the profile. */
export default function SavingsQuickAdd({ members, notesSuggestions = [] }: { members: Member[]; notesSuggestions?: string[] }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const label = (m: Member) => `${m.borrower_code} — ${m.full_name}`;
  const selected = members.find((m) => label(m) === text) || null;
  const today = todayISO();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">➕ Savings</button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={() => setOpen(false)}>
          <form action={quickSavingsAction} className="bg-white rounded-2xl w-full max-w-xl p-5 shadow-xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy">Add Savings</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 text-xl leading-none" aria-label="Close">✕</button>
            </div>

            <div>
              <label className="label">Member * <span className="text-gray-400 font-normal">(type ID or name)</span></label>
              <input
                list="quick-savings-members"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`input ${text && !selected ? '!border-amber-400' : ''}`}
                placeholder="e.g. 108 — Mukesh Ambani"
                autoComplete="off"
                autoFocus
              />
              <datalist id="quick-savings-members">
                {members.map((m) => <option key={m.id} value={label(m)}>{m.phone}</option>)}
              </datalist>
              <input type="hidden" name="borrower_id" value={selected?.id ?? ''} />
              {text && !selected && <p className="text-xs text-amber-600 mt-1">Pick a member from the suggestions.</p>}
              {selected && <p className="text-xs text-green-700 mt-1">✓ {selected.full_name} · {selected.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <select name="type" className="input" defaultValue="deposit">
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </div>
              <div>
                <label className="label">Amount (৳) *</label>
                <input name="amount" type="number" step="0.01" min="0.01" required className="input" inputMode="decimal" />
              </div>
              <div>
                <label className="label">Date</label>
                <DateInput name="transaction_date" defaultValue={today} className="input" />
              </div>
              <div>
                <label className="label">Notes</label>
                <input name="notes" list="quick-savings-notes" className="input" />
                <datalist id="quick-savings-notes">
                  {notesSuggestions.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Cancel</button>
              <SaveButton disabled={!selected} />
            </div>
          </form>
        </div>
      )}
    </>
  );
}
