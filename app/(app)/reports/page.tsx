import Link from 'next/link';
import { getCreditSummary, getLoansForBorrower, getPaymentsForBorrower, getAllUsersFullHistory } from '@/lib/data';
import { money, buildSingleUserShareText, buildAllUsersShareText, statusBadgeClass, frequencyShortLabel } from '@/lib/utils';
import ExportButtons from './ExportButtons';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { mode?: string; borrower?: string; q?: string };
}) {
  const mode = searchParams.mode === 'single' ? 'single' : 'all';

  if (mode === 'single') {
    const borrowerId = Number(searchParams.borrower || 0);
    const allRows = await getCreditSummary();
    const selected = borrowerId ? allRows.find((r: any) => r.id === borrowerId) : null;
    const loans = selected ? ((await getLoansForBorrower(selected.id)) as any[]) : [];
    const payments = selected ? ((await getPaymentsForBorrower(selected.id)) as any[]) : [];
    const shareText = selected ? buildSingleUserShareText(selected, loans) : '';

    return (
      <div>
        <ModeSwitch mode={mode} />

        <form className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
          <input type="hidden" name="mode" value="single" />
          <div className="flex-1 min-w-[220px]">
            <label className="label">Choose a borrower</label>
            <select name="borrower" defaultValue={borrowerId || ''} className="input">
              <option value="">-- Select a borrower --</option>
              {allRows.map((r: any) => (
                <option key={r.id} value={r.id}>{r.full_name} ({r.borrower_code})</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">View Report</button>
        </form>

        {selected && (
          <div className="card p-5">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div>
                <h2 className="font-bold text-navy text-lg">{selected.full_name}</h2>
                <p className="text-sm text-gray-500">{selected.borrower_code} · {selected.phone}</p>
              </div>
              <ExportButtons mode="single" borrower={selected} loans={loans} payments={payments} shareText={shareText} />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-tealight rounded-lg p-3"><div className="text-xs text-gray-500">Borrowed</div><div className="font-bold text-navy">৳{money(selected.total_borrowed)}</div></div>
              <div className="bg-tealight rounded-lg p-3"><div className="text-xs text-gray-500">Paid</div><div className="font-bold text-navy">৳{money(selected.total_paid)}</div></div>
              <div className="bg-tealight rounded-lg p-3"><div className="text-xs text-gray-500">Outstanding</div><div className="font-bold text-navy">৳{money(selected.outstanding_balance)}</div></div>
            </div>

            <h3 className="font-semibold text-sm mb-2">Loans</h3>
            <table className="app-table mb-5">
              <thead><tr><th>Loan Code</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {loans.length === 0 && <tr><td colSpan={3} className="text-center text-gray-400 py-4">No loans.</td></tr>}
                {loans.map((l) => (
                  <tr key={l.id}><td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td><td>৳{money(l.loan_amount)}</td><td>{l.status}</td></tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-semibold text-sm mb-2">Payment History</h3>
            <table className="app-table">
              <thead><tr><th>Receipt No.</th><th>Loan Code</th><th>Date</th><th>Amount</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-4">No payments.</td></tr>}
                {payments.map((p) => (
                  <tr key={p.id}><td>{p.receipt_no}</td><td>{p.loan_code}</td><td>{new Date(p.payment_date).toLocaleDateString()}</td><td>৳{money(p.amount_paid)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // All-users mode — full history per borrower
  const rows = await getAllUsersFullHistory(searchParams.q);
  const shareText = buildAllUsersShareText(rows);
  const totals = rows.reduce(
    (acc: any, r: any) => ({
      borrowed: acc.borrowed + Number(r.total_borrowed),
      paid: acc.paid + Number(r.total_paid),
      outstanding: acc.outstanding + Number(r.outstanding_balance),
    }),
    { borrowed: 0, paid: 0, outstanding: 0 }
  );

  return (
    <div>
      <ModeSwitch mode={mode} />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <form className="flex gap-2">
          <input type="hidden" name="mode" value="all" />
          <input name="q" defaultValue={searchParams.q} placeholder="Search borrower..." className="input max-w-xs" />
          <button className="btn btn-outline">Search</button>
        </form>
        <ExportButtons mode="all" rows={rows} shareText={shareText} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(totals.borrowed)}</div><div className="text-xs text-gray-500">Total Borrowed</div></div>
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(totals.paid)}</div><div className="text-xs text-gray-500">Total Paid</div></div>
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(totals.outstanding)}</div><div className="text-xs text-gray-500">Total Outstanding</div></div>
      </div>

      <p className="text-xs text-gray-400 mb-3">Tap a borrower to expand their full loan and payment history.</p>

      {rows.length === 0 && <div className="card p-8 text-center text-gray-400">No borrowers found.</div>}

      <div className="space-y-2">
        {rows.map((r: any) => (
          <details key={r.id} className="card overflow-hidden group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden p-4 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.full_name}</span>
              <span className="text-xs text-gray-400">{r.borrower_code} · {r.phone}</span>
              <span className={`badge ${r.credit_status === 'Overdue' ? 'bg-red-100 text-red-700' : r.credit_status === 'Active Debt' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{r.credit_status}</span>
              <span className="ml-auto text-sm text-gray-500">Outstanding: ৳{money(r.outstanding_balance)}</span>
            </summary>

            <div className="border-t border-gray-100 p-4">
              <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Loan History</h4>
              <table className="app-table mb-4">
                <thead><tr><th>Loan Code</th><th>Amount</th><th>Tenure</th><th>Total Payable</th><th>Status</th></tr></thead>
                <tbody>
                  {r.loans.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-3">No loans on record.</td></tr>}
                  {r.loans.map((l: any) => (
                    <tr key={l.id}>
                      <td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td>
                      <td>৳{money(l.loan_amount)}</td>
                      <td>{l.tenure} {frequencyShortLabel(l.repayment_frequency)}</td>
                      <td>৳{money(l.total_payable)}</td>
                      <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Payment History</h4>
              <table className="app-table">
                <thead><tr><th>Receipt No.</th><th>Loan Code</th><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
                <tbody>
                  {r.payments.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-3">No payments recorded.</td></tr>}
                  {r.payments.map((p: any) => (
                    <tr key={p.id}>
                      <td>{p.receipt_no}</td><td>{p.loan_code}</td><td>{new Date(p.payment_date).toLocaleDateString()}</td><td>৳{money(p.amount_paid)}</td><td>{p.payment_method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ModeSwitch({ mode }: { mode: string }) {
  return (
    <div className="flex gap-2 mb-4">
      <Link href="/reports?mode=all" className={`btn ${mode === 'all' ? 'btn-primary' : 'btn-outline'}`}>All Users Report</Link>
      <Link href="/reports?mode=single" className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-outline'}`}>Single User Report</Link>
    </div>
  );
}
