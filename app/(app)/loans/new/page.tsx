import { sql } from '@/lib/db';
import { createLoanAction } from '@/lib/actions';

export default async function NewLoanPage({ searchParams }: { searchParams: { borrower_id?: string; error?: string } }) {
  const borrowers = await sql`SELECT id, full_name, borrower_code, phone FROM borrowers WHERE status = 'active' ORDER BY full_name`;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Loan Registration</h1>
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <form action={createLoanAction} className="card p-6 max-w-3xl space-y-5">
        <div>
          <label className="label">Select Borrower *</label>
          <select name="borrower_id" required defaultValue={searchParams.borrower_id || ''} className="input">
            <option value="">-- Choose Borrower --</option>
            {(borrowers as any[]).map((b) => (
              <option key={b.id} value={b.id}>{b.full_name} ({b.borrower_code}) — {b.phone}</option>
            ))}
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="label">Loan Amount (৳) *</label><input name="loan_amount" type="number" step="0.01" required className="input" /></div>
          <div><label className="label">Interest Rate (% p.a.) *</label><input name="interest_rate" type="number" step="0.01" defaultValue={10} required className="input" /></div>
          <div>
            <label className="label">Interest Type</label>
            <select name="interest_type" className="input">
              <option value="flat">Flat</option>
              <option value="declining">Declining Balance</option>
            </select>
          </div>
          <div><label className="label">Tenure (installments) *</label><input name="tenure" type="number" placeholder="e.g. 12" required className="input" /></div>
          <div>
            <label className="label">Repayment Frequency</label>
            <select name="repayment_frequency" className="input" defaultValue="monthly">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div><label className="label">Disbursement Date</label><input name="disbursement_date" type="date" defaultValue={today} className="input" /></div>
          <div className="md:col-span-3"><label className="label">Purpose</label><input name="purpose" className="input" /></div>
        </div>

        <div className="text-sm bg-sky-50 text-sky-800 rounded-lg px-3 py-2">
          ℹ️ The installment schedule is generated automatically. The loan starts as <strong>Pending</strong> until approved.
        </div>

        <button type="submit" className="btn btn-primary">Register Loan</button>
      </form>
    </div>
  );
}
