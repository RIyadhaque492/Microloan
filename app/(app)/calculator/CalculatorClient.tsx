'use client';

import { useMemo, useState } from 'react';
import { generateSchedule, money, frequencyShortLabel } from '@/lib/utils';

export default function CalculatorClient() {
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(10);
  const [tenure, setTenure] = useState(12);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const schedule = useMemo(() => {
    if (!principal || principal <= 0 || !tenure || tenure <= 0 || !startDate) return null;
    try {
      return generateSchedule(principal, rate, tenure, frequency, startDate);
    } catch {
      return null;
    }
  }, [principal, rate, tenure, frequency, startDate]);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Quickly quote a loan to a borrower before registering it — nothing here is saved. Uses the exact same flat-interest math as loan registration.
      </p>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4 h-fit">
          <div>
            <label className="label">Loan Amount (৳)</label>
            <input type="number" step="0.01" className="input" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Interest Rate (% flat)</label>
            <input type="number" step="0.01" className="input" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
            <p className="text-xs text-gray-400 mt-1">Applied once to the whole loan — not per year.</p>
          </div>
          <div>
            <label className="label">Tenure (installments)</label>
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
            <div className="card p-6 text-gray-400 text-sm">Enter a valid loan amount and tenure to see the schedule.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4">
                  <div className="text-lg font-bold text-navy">৳{money(schedule.totalPayable)}</div>
                  <div className="text-xs text-gray-500">Total Payable</div>
                </div>
                <div className="card p-4">
                  <div className="text-lg font-bold text-navy">৳{money(schedule.installmentAmount)}</div>
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
