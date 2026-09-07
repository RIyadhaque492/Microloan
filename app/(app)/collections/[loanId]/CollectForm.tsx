'use client';

import { useState } from 'react';
import { collectPaymentAction } from '@/lib/actions';

type Installment = { id: number; installment_no: number; due_date: string; amount: string; paid_amount: string; status: string };

export default function CollectForm({ loanId, installments, preselectId }: { loanId: number; installments: Installment[]; preselectId: number }) {
  const initial = installments.find((i) => i.id === preselectId) || installments[0];
  const [selectedId, setSelectedId] = useState<number | ''>(initial?.id ?? '');
  const [amount, setAmount] = useState(initial ? (Number(initial.amount) - Number(initial.paid_amount)).toFixed(2) : '');

  function onSelectChange(id: number) {
    setSelectedId(id);
    const found = installments.find((i) => i.id === id);
    if (found) setAmount((Number(found.amount) - Number(found.paid_amount)).toFixed(2));
  }

  return (
    <form action={collectPaymentAction} className="card p-5 space-y-4">
      <input type="hidden" name="loan_id" value={loanId} />
      <div>
        <label className="label">Apply Starting From Installment</label>
        <select
          name="installment_id"
          className="input"
          value={selectedId}
          onChange={(e) => onSelectChange(Number(e.target.value))}
        >
          {installments.map((i) => (
            <option key={i.id} value={i.id}>
              #{i.installment_no} — Due {new Date(i.due_date).toLocaleDateString()} — ৳{(Number(i.amount) - Number(i.paid_amount)).toFixed(2)} due ({i.status})
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">Overpayment automatically rolls into the next unpaid installment.</p>
      </div>
      <div>
        <label className="label">Amount Paid (৳) *</label>
        <input name="amount_paid" type="number" step="0.01" required className="input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Auto-filled from the installment above — edit it if collecting a different amount.</p>
      </div>
      <div>
        <label className="label">Payment Method</label>
        <select name="payment_method" className="input" defaultValue="cash">
          <option value="cash">Cash</option>
          <option value="bank">Bank Transfer</option>
          <option value="mobile_banking">Mobile Banking</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label">Payment Date</label>
        <input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea name="notes" className="input" rows={2} />
      </div>
      <button type="submit" className="btn btn-primary">Record Payment</button>
    </form>
  );
}
