'use client';

import { useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createLoanAction, saveDraftLoanAction } from '@/lib/actions';
import { generateScheduleFromInstallment, money } from '@/lib/utils';

function RegisterButton() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
        {pending ? 'Registering…' : '✅ Register Loan'}
      </button>
      {pending && (
        <div className="fixed inset-0 z-[200] bg-black/30 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500 text-white text-5xl flex items-center justify-center mx-auto mb-3">✓</div>
            <div className="text-lg font-bold text-green-700">Registered successfully</div>
          </div>
        </div>
      )}
    </>
  );
}

function DraftButton({ formAction }: { formAction: any }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending} className="btn btn-outline disabled:opacity-60">
      {pending ? 'Saving…' : '💾 Save as Draft'}
    </button>
  );
}

export default function LoanForm({ borrowers, preselectBorrowerId, today, purposeSuggestions = [] }: { borrowers: any[]; preselectBorrowerId: number; today: string; purposeSuggestions?: string[] }) {
  const [amount, setAmount] = useState<number>(0);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentTouched, setInstallmentTouched] = useState(false);
  // Suggested defaults: 116 installments, paid daily — all still editable.
  const [tenure, setTenure] = useState<number>(116);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState(today);
  const [maturityDate, setMaturityDate] = useState('');
  const [maturityTouched, setMaturityTouched] = useState(false);
  const [feeTouched, setFeeTouched] = useState(false);
  const [processingFee, setProcessingFee] = useState('');

  const preview = useMemo(() => {
    if (amount <= 0 || installmentAmount <= 0 || tenure <= 0 || !startDate) return null;
    try {
      return generateScheduleFromInstallment(amount, installmentAmount, tenure, frequency, startDate);
    } catch {
      return null;
    }
  }, [amount, installmentAmount, tenure, frequency, startDate]);

  // Auto-calculate the maturity date from the disbursement date + number of
  // installments + repayment frequency (the due date of the final installment)
  // — but only while the admin hasn't overridden it by hand, so a manual edit
  // always wins over the auto-calculation.
  const autoMaturityDate = preview && preview.installments.length > 0
    ? preview.installments[preview.installments.length - 1].dueDate
    : '';
  if (!maturityTouched && autoMaturityDate && autoMaturityDate !== maturityDate) {
    // Safe to set state during render here (React "derived state" pattern) since
    // it only fires when the computed value actually changes.
    setMaturityDate(autoMaturityDate);
  }

  // Installment amount suggests 1% of the loan amount until the admin types their own.
  const autoInstallment = amount > 0 ? Math.round(amount) / 100 : 0;
  if (!installmentTouched && autoInstallment !== installmentAmount) setInstallmentAmount(autoInstallment);

  // Processing fee shows 2% of the loan amount automatically — editable, and stays as typed once edited.
  const autoFee = amount > 0 ? (Math.round(amount * 2) / 100).toFixed(2) : '';
  if (!feeTouched && autoFee !== processingFee) setProcessingFee(autoFee);

  return (
    <form action={createLoanAction} className="card p-6 max-w-3xl space-y-5">
      <div>
        <label className="label">Select Member *</label>
        <select name="borrower_id" required defaultValue={preselectBorrowerId || ''} className="input">
          <option value="">-- Choose Member --</option>
          {borrowers.map((b) => (
            <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code}) — {b.phone}</option>
          ))}
        </select>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="label">Loan Amount (৳) *</label>
          <input name="loan_amount" type="number" step="0.01" required className="input" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Installment Amount (৳) *</label>
          <input name="installment_amount" type="number" step="0.01" required className="input" value={installmentAmount || ''} onChange={(e) => { setInstallmentTouched(true); setInstallmentAmount(Number(e.target.value)); }} />
          <p className="text-xs text-gray-400 mt-1">Suggested 1% of loan amount — editable.{installmentTouched && amount > 0 && <> · <button type="button" className="text-teal underline" onClick={() => setInstallmentTouched(false)}>reset</button></>}</p>
        </div>
        <div>
          <label className="label">Number of Installments *</label>
          <input name="tenure" type="number" required className="input" placeholder="e.g. 116" value={tenure || ''} onChange={(e) => setTenure(Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Repayment Frequency</label>
          <select name="repayment_frequency" className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="label">Interest Type</label>
          <select name="interest_type" className="input">
            <option value="flat">Flat</option>
            <option value="declining">Declining Balance</option>
          </select>
        </div>
        <div>
          <label className="label">Disbursement Date</label>
          <input name="disbursement_date" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
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
          <input
            name="processing_fee"
            type="number"
            step="0.01"
            className="input bg-amber-50"
            value={processingFee}
            onChange={(e) => { setFeeTouched(true); setProcessingFee(e.target.value); }}
          />
          <p className="text-xs text-gray-400 mt-1">2% of the loan amount — editable.</p>
        </div>
        <div className="md:col-span-3">
          <label className="label">Purpose of Loan</label>
          <input name="purpose" list="purpose-suggestions" className="input" placeholder="e.g. Small business" />
          <datalist id="purpose-suggestions">
            {["Small business", "Agriculture", "Livestock", "Shop / trading", "Education", "Housing repair", ...purposeSuggestions].filter((v, i, a) => a.indexOf(v) === i).map((v) => <option key={v} value={v} />)}
          </datalist>
        </div>
      </div>

      {preview ? (
        <div className="rounded-lg bg-tealight border border-teal-100 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div><div className="text-gray-500 text-xs">Total Payable</div><div className="font-bold text-navy">৳{money(preview.totalPayable)}</div></div>
          <div><div className="text-gray-500 text-xs">Interest Amount</div><div className="font-bold text-navy">৳{money(preview.totalPayable - amount)}</div></div>
          <div><div className="text-gray-500 text-xs">Calculated Interest Rate</div><div className="font-bold text-teal">{preview.interestRate}%</div></div>
        </div>
      ) : (
        <div className="text-sm bg-gray-50 text-gray-500 rounded-lg px-3 py-2">
          Enter the loan amount, installment amount, and number of installments to see the calculated interest rate.
        </div>
      )}

      <div className="text-sm bg-sky-50 text-sky-800 rounded-lg px-3 py-2">
        ℹ️ The installment schedule is generated automatically. The loan starts as <strong>Pending</strong> until approved.
      </div>

      <div className="text-sm bg-amber-50 text-amber-800 rounded-lg px-3 py-2">
        📎 Make sure the member's and guarantor's ID documents are uploaded before approving this loan.
        {preselectBorrowerId > 0 && (
          <> <a href={`/borrowers/${preselectBorrowerId}#documents`} className="underline font-semibold" target="_blank" rel="noopener noreferrer">Check/upload documents</a></>
        )}
      </div>

      <div className="flex gap-2">
        <DraftButton formAction={saveDraftLoanAction} />
        <RegisterButton />
      </div>
    </form>
  );
}
