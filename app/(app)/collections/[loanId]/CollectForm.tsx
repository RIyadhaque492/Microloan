'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { collectPaymentAction } from '@/lib/actions';

type Installment = { id: number; installment_no: number; due_date: string; amount: string; paid_amount: string; status: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
      {pending ? 'Recording…' : '💵 Record Payment'}
    </button>
  );
}

export default function CollectForm({
  loanId,
  installments,
  preselectId,
  lastInput = null,
  notesSuggestions = [],
}: {
  loanId: number;
  installments: Installment[];
  preselectId: number;
  lastInput?: { amount: string; method: string; notes: string } | null;
  notesSuggestions?: string[];
}) {
  const initial = installments.find((i) => i.id === preselectId) || installments[0];
  const [selectedId, setSelectedId] = useState<number | ''>(initial?.id ?? '');
  // Amount, method and notes start as whatever was entered last; the date is always today.
  const [amount, setAmount] = useState(lastInput?.amount || (initial ? (Number(initial.amount) - Number(initial.paid_amount)).toFixed(2) : ''));

  function onSelectChange(id: number) {
    setSelectedId(id);
    const found = installments.find((i) => i.id === id);
    if (found && !lastInput) setAmount((Number(found.amount) - Number(found.paid_amount)).toFixed(2));
  }

  return (
    <form action={collectPaymentAction} className="card p-4 shadow-sm">
      <input type="hidden" name="loan_id" value={loanId} />
      <div className="grid grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="label !mb-0.5">Apply Starting From Installment</label>
          <select name="installment_id" className="input" value={selectedId} onChange={(e) => onSelectChange(Number(e.target.value))}>
            {installments.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.installment_no} — Due {new Date(i.due_date).toLocaleDateString()} — ৳{(Number(i.amount) - Number(i.paid_amount)).toFixed(2)} due ({i.status})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label !mb-0.5">Amount Paid (৳) *</label>
          <input name="amount_paid" type="number" step="0.01" required className="input font-bold text-base !border-amber-300" style={{ backgroundColor: '#FFF6DC' }} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <label className="label !mb-0.5">Payment Method</label>
          <select name="payment_method" className="input" defaultValue={lastInput?.method || 'cash'}>
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="mobile_banking">Mobile Banking</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label !mb-0.5">Payment Date</label>
          <input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label !mb-0.5">Notes</label>
          <input name="notes" className="input" defaultValue={lastInput?.notes || 'Installment'} list="notes-suggestions" />
          <datalist id="notes-suggestions">
            {notesSuggestions.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
      </div>
      <div className="mt-3">
        <SubmitButton />
      </div>
    </form>
  );
}
