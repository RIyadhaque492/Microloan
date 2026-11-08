'use client';

import { useState } from 'react';
import DateInput from '@/app/(app)/DateInput';
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES } from '@/lib/cashCategories';

/** Cash In / Cash Out entry form. The category list follows the chosen type; custom categories can be typed. */
export default function EntryForm({
  action, initial, today, error, submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: { direction: 'in' | 'out'; date: string; category: string; description: string; amount: string };
  today: string;
  error?: string;
  submitLabel: string;
}) {
  const [dir, setDir] = useState<'in' | 'out'>(initial.direction);
  const cats = dir === 'in' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

  return (
    <form action={action} className="card p-6 max-w-2xl space-y-4">
      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}
      <input type="hidden" name="direction" value={dir} />

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDir('in')}
          className={`rounded-xl border-2 px-4 py-3 font-semibold transition ${dir === 'in' ? 'border-green-600 bg-green-50 text-green-800 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          ⬇ Cash In <span className="block text-xs font-normal">money received</span>
        </button>
        <button type="button" onClick={() => setDir('out')}
          className={`rounded-xl border-2 px-4 py-3 font-semibold transition ${dir === 'out' ? 'border-red-600 bg-red-50 text-red-800 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
          ⬆ Cash Out <span className="block text-xs font-normal">money paid</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="label">Date</label>
          <DateInput name="entry_date" defaultValue={initial.date || today} required className="input" />
        </div>
        <div>
          <label className="label">Amount (In BDT)</label>
          <input name="amount" type="number" step="0.01" min="0.01" required defaultValue={initial.amount} className="input font-semibold" placeholder="0.00" />
        </div>
      </div>

      <div>
        <label className="label">Category</label>
        <input name="category" list="cash-cats" required defaultValue={initial.category} className="input" placeholder={dir === 'in' ? 'e.g. Capital / Investment' : 'e.g. Salary'} key={dir} />
        <datalist id="cash-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
        <p className="text-xs text-gray-400 mt-1">Pick from the list or type your own.</p>
      </div>

      <div>
        <label className="label">Description / Note</label>
        <input name="description" defaultValue={initial.description} maxLength={255} className="input" placeholder="e.g. Office rent for November" />
      </div>

      <p className="text-xs text-gray-500 rounded-lg bg-tealight px-3 py-2">
        Loan collections, savings, loan disbursements and fees already appear in the Cash Book by themselves — only add what the system doesn’t know (salary, rent, capital, bank deposit…).
        To start your book at today’s cash in hand, add a <strong>Cash In</strong> entry with the category <strong>Opening Balance</strong>.
      </p>

      <div className="flex gap-3">
        <button className="btn btn-primary">{submitLabel}</button>
        <a href="/accounts" className="btn btn-outline">Cancel</a>
      </div>
    </form>
  );
}
