'use client';

import { useMemo, useState } from 'react';
import { generateScheduleFromInstallment } from '@/lib/utils';

export default function EditDraftForm({ loan, borrowers, updateAction, submitLabel = 'Save Draft Changes' }: { loan: any; borrowers: any[]; updateAction: (formData: FormData) => void | Promise<void>; submitLabel?: string }) {
  const [amount, setAmount] = useState<number>(Number(loan.loan_amount) || 0);
  const [installmentAmount, setInstallmentAmount] = useState<number>(Number(loan.installment_amount) || 0);
  const [tenure, setTenure] = useState<number>(Number(loan.tenure) || 0);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(loan.repayment_frequency || 'monthly');
  const [startDate, setStartDate] = useState(loan.disbursement_date ? new Date(loan.disbursement_date).toISOString().slice(0, 10) : '');
  const [maturityDate, setMaturityDate] = useState(loan.maturity_date ? new Date(loan.maturity_date).toISOString().slice(0, 10) : '');
  const [maturityTouched, setMaturityTouched] = useState(!!loan.maturity_date);
  const [processingFee, setProcessingFee] = useState(String(Number(loan.processing_fee) || (Number(loan.loan_amount) ? (Math.round(Number(loan.loan_amount) * 2) / 100).toFixed(2) : '')));

  const preview = useMemo(() => {
    if (amount <= 0 || installmentAmount <= 0 || tenure <= 0 || !startDate) return null;
    try {
      return generateScheduleFromInstallment(amount, installmentAmount, tenure, frequency, startDate);
    } catch {
      return null;
    }
  }, [amount, installmentAmount, tenure, frequency, startDate]);

  const autoMaturityDate = preview && preview.installments.length > 0
    ? preview.installments[preview.installments.length - 1].dueDate
    : '';
  if (!maturityTouched && autoMaturityDate && autoMaturityDate !== maturityDate) {
    setMaturityDate(autoMaturityDate);
  }

  return (
    <form action={updateAction} className="card p-6 max-w-3xl space-y-5">
      <div>
        <label className="label">Select Member *</label>
        <select name="borrower_id" required defaultValue={loan.borrower_id} className="input">
          <option value="">-- Choose Member --</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code}) — {b.phone}</option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Loan Amount (৳) *</label>
          <input name="loan_amount" type="number" step="0.01" required value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="label">Installment Amount (৳) *</label>
          <input name="installment_amount" type="number" step="0.01" required value={installmentAmount || ''} onChange={(e) => setInstallmentAmount(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="label">Number of Installments *</label>
          <input name="tenure" type="number" required value={tenure || ''} onChange={(e) => setTenure(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="label">Repayment Frequency</label>
          <select name="repayment_frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="input">
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="label">Interest Type</label>
          <select name="interest_type" defaultValue={loan.interest_type} className="input">
            <option value="flat">Flat</option><option value="declining">Declining Balance</option>
          </select>
        </div>
        <div>
          <label className="label">Disbursement Date</label>
          <input name="disbursement_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
        </div>
        <div>
          <label className="label">Maturity Date</label>
          <input
            name="maturity_date"
            type="date"
            className="input"
            value={maturityDate}
            onChange={(e) => { setMaturityTouched(true); setMaturityDate(e.target.value); }}
          />
          <p className="text-xs text-gray-400 mt-1">
            Auto-calculated from tenure + repayment frequency — still editable
            {maturityTouched && autoMaturityDate && (
              <> · <button type="button" className="text-teal underline" onClick={() => { setMaturityTouched(false); setMaturityDate(autoMaturityDate); }}>reset to auto</button></>
            )}
          </p>
        </div>
        <div>
          <label className="label">Processing Fee (৳)</label>
          <input name="processing_fee" type="number" step="0.01" value={processingFee} onChange={(e) => setProcessingFee(e.target.value)} className="input bg-amber-50" />
          <p className="text-xs text-gray-400 mt-1">2% of loan amount by default — editable.</p>
        </div>
        <div className="md:col-span-3"><label className="label">Purpose of Loan</label><input name="purpose" defaultValue={loan.purpose} className="input" /></div>
      </div>

      {preview && (
        <div className="rounded-lg bg-tealight border border-teal-100 p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span>Total Payable: <strong>৳{preview.totalPayable.toFixed(2)}</strong></span>
          <span>Interest rate: <strong>{preview.interestRate}%</strong></span>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );
}
