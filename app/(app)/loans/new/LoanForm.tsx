'use client';

import { useMemo, useState } from 'react';
import { createLoanAction } from '@/lib/actions';
import { generateScheduleFromInstallment, money } from '@/lib/utils';

export default function LoanForm({ borrowers, preselectBorrowerId, today }: { borrowers: any[]; preselectBorrowerId: number; today: string }) {
  const [amount, setAmount] = useState<number>(0);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [tenure, setTenure] = useState<number>(0);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState(today);

  const preview = useMemo(() => {
    if (amount <= 0 || installmentAmount <= 0 || tenure <= 0 || !startDate) return null;
    try {
      return generateScheduleFromInstallment(amount, installmentAmount, tenure, frequency, startDate);
    } catch {
      return null;
    }
  }, [amount, installmentAmount, tenure, frequency, startDate]);

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
          <input name="installment_amount" type="number" step="0.01" required className="input" value={installmentAmount || ''} onChange={(e) => setInstallmentAmount(Number(e.target.value))} />
          <p className="text-xs text-gray-400 mt-1">How much the member pays per installment.</p>
        </div>
        <div>
          <label className="label">Number of Installments *</label>
          <input name="tenure" type="number" required className="input" placeholder="e.g. 12" value={tenure || ''} onChange={(e) => setTenure(Number(e.target.value))} />
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
        <div className="md:col-span-3">
          <label className="label">Purpose of Loan</label>
          <input name="purpose" className="input" placeholder="e.g. Small business" />
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

      <button type="submit" className="btn btn-primary">Register Loan</button>
    </form>
  );
}
