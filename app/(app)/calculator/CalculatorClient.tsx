'use client';

import { useMemo, useState } from 'react';
import { generateScheduleFromInstallment, money, frequencyShortLabel } from '@/lib/utils';

export default function CalculatorClient() {
  const [principal, setPrincipal] = useState(10000);
  const [installmentAmount, setInstallmentAmount] = useState(1000);
  const [tenure, setTenure] = useState(12);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const schedule = useMemo(() => {
    if (!principal || principal <= 0 || !installmentAmount || installmentAmount <= 0 || !tenure || tenure <= 0 || !startDate) return null;
    try {
      return generateScheduleFromInstallment(principal, installmentAmount, tenure, frequency, startDate);
    } catch {
      return null;
    }
  }, [principal, installmentAmount, tenure, frequency, startDate]);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Enter the loan amount, the installment amount you want to collect, and the number of installments — the interest rate is calculated automatically. Nothing here is saved. Uses the exact same math as loan registration.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4 h-fit">
          <div>
            <label className="label">Loan Amount (৳)</label>
            <input type="number" step="0.01" className="input" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Installment Amount (৳)</label>
            <input type="number" step="0.01" className="input" value={installmentAmount} onChange={(e) => setInstallmentAmount(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Number of Installments</label>
            <input type="number" className="input" value={tenure} onChange={(e) => setTenure(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Repayment Frequency</label>
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-4">
          {!schedule ? (
            <div className="card p-6 text-gray-400 text-sm">Enter a valid loan amount, installment amount, and tenure to see the calculated schedule.</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="card p-4">
                  <div className="text-lg font-bold text-navy">৳{money(schedule.totalPayable)}</div>
                  <div className="text-xs text-gray-500">Total Payable</div>
                </div>
                <div className="card p-4">
                  <div className="text-lg font-bold text-teal">{schedule.interestRate}%</div>
                  <div className="text-xs text-gray-500">Calculated Interest Rate</div>
                </div>
                <div className="card p-4">
                  <div className="text-lg font-bold text-navy">৳{money(installmentAmount)}</div>
                  <div className="text-xs text-gray-500">Per Installment ({frequencyShortLabel(frequency)})</div>
                </div>
              </div>
              <div className="table-wrap max-h-[26rem] overflow-y-auto">
                <table className="app-table">
                  <thead><tr><th>#</th><th>Due Date</th><th>Amount</th></tr></thead>
                  <tbody>
                    {schedule.installments.map((i) => (
                      <tr key={i.installmentNo}>
                        <td>{i.installmentNo}</td>
                        <td>{new Date(i.dueDate + 'T00:00:00').toLocaleDateString()}</td>
                        <td>৳{money(i.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
