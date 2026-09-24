import Link from 'next/link';
import { getCreditSummary, getPaymentsForBorrower } from '@/lib/data';
import { money, buildSingleUserShareText, buildAllUsersShareText } from '@/lib/utils';
import ExportButtons from './ExportButtons';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Reports - MicroLoan Admin' };

const STATUS_STYLE: Record<string, string> = {
  Overdue: 'bg-red-100 text-red-700 border-red-200',
  'Active Debt': 'bg-amber-100 text-amber-700 border-amber-200',
  Clear: 'bg-green-100 text-green-700 border-green-200',
};

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
    const payments = selected ? ((await getPaymentsForBorrower(selected.id)) as any[]) : [];
    const orderedPayments = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    const shareText = selected ? buildSingleUserShareText(selected, []) : '';

    return (
      <div>
        <PageHeader title="Reports" />
        <ModeSwitch mode={mode} />

        <form className="card p-4 mb-4 flex flex-wrap gap-3 items-end">
          <input type="hidden" name="mode" value="single" />
          <div className="flex-1 min-w-[220px]">
            <label className="label">Choose a member</label>
            <select name="borrower" defaultValue={borrowerId || ''} className="input">
              <option value="">-- Select a member --</option>
              {allRows.map((r: any) => (
                <option key={r.id} value={r.id}>{r.borrower_code} — {r.full_name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary">View Report</button>
        </form>

        {selected && (
          <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
            <div className="bg-navy text-white px-5 py-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-bold text-lg">Member Credit / Debt Report</h2>
                <p className="text-teal-100 text-xs opacity-90">Generated: {new Date().toLocaleString()}</p>
              </div>
              <ExportButtons mode="single" borrower={selected} payments={payments} shareText={shareText} onDark />
            </div>

            <div className="bg-white p-5">
              <table className="app-table">
                <thead><tr><th>Member ID</th><th>Name</th><th>Loan Amount</th><th>Paid</th><th>Remaining Balance</th><th>Status</th></tr></thead>
                <tbody>
                  <tr>
                    <td className="font-semibold">{selected.borrower_code}</td>
                    <td>{selected.full_name}</td>
                    <td>৳{money(selected.total_borrowed)}</td>
                    <td>৳{money(selected.total_paid)}</td>
                    <td className="font-semibold">৳{money(selected.outstanding_balance)}</td>
                    <td><span className={`badge border ${STATUS_STYLE[selected.credit_status]}`}>{selected.credit_status}</span></td>
                  </tr>
                </tbody>
              </table>

              <h3 className="font-semibold text-sm text-navy mt-6 mb-2">Payment History — every installment tracked individually</h3>
              <table className="app-table">
                <thead><tr><th>SL</th><th>Receipt No.</th><th>Particulars</th><th>Date</th><th>Amount Paid</th><th>Running Total</th><th>Remaining Balance</th></tr></thead>
                <tbody>
                  {orderedPayments.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-6">No payments recorded.</td></tr>}
                  {(() => {
                    let running = 0;
                    const totalOwed = Number(selected.outstanding_balance) + Number(selected.total_paid);
                    return orderedPayments.map((p, i) => {
                      running += Number(p.amount_paid);
                      return (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{p.receipt_no}</td>
                          <td>{p.notes || 'Payment'}</td>
                          <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td>৳{money(p.amount_paid)}</td>
                          <td className="font-semibold">৳{money(running)}</td>
                          <td>৳{money(totalOwed - running)}</td>
                        </tr>
                      );
                    });
                  })()}
                  {orderedPayments.length > 0 && (
                    <tr className="bg-tealight font-bold">
                      <td colSpan={5} className="text-right">TOTAL PAID</td>
                      <td>৳{money(orderedPayments.reduce((s, p) => s + Number(p.amount_paid), 0))}</td>
                      <td>৳{money(selected.outstanding_balance)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Link href={`/borrowers/${selected.id}`} className="btn btn-outline mt-4">View Full Member Profile</Link>
            </div>

            <div className="bg-navy text-white px-5 py-3 flex flex-wrap justify-around gap-3 text-sm">
              <span><strong>Total Borrowed:</strong> ৳{money(selected.total_borrowed)}</span>
              <span><strong>Total Paid:</strong> ৳{money(selected.total_paid)}</span>
              <span><strong>Outstanding:</strong> ৳{money(selected.outstanding_balance)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const rows = await getCreditSummary(searchParams.q);
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
      <PageHeader title="Reports" />
      <ModeSwitch mode={mode} />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <form className="flex gap-2">
          <input type="hidden" name="mode" value="all" />
          <input name="q" defaultValue={searchParams.q} placeholder="Search member..." className="input max-w-xs" />
          <button className="btn btn-outline">Search</button>
        </form>
        <ExportButtons mode="all" rows={rows} shareText={shareText} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs text-sky-700">Total Loan Amount</div>
          <div className="text-lg font-bold text-navy">৳{money(totals.borrowed)}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs text-green-700">Total Paid</div>
          <div className="text-lg font-bold text-green-800">৳{money(totals.paid)}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs text-red-700">Total Remaining Balance</div>
          <div className="text-lg font-bold text-red-800">৳{money(totals.outstanding)}</div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
        <div className="bg-gold text-white px-5 py-3 font-semibold text-sm" style={{ backgroundColor: '#d99a2b' }}>All Members Summary — {rows.length} member(s)</div>
        <div className="table-wrap !rounded-none !border-0">
          <table className="app-table">
            <thead><tr><th>Member ID</th><th>Name</th><th>Loan Amount</th><th>Paid</th><th>Remaining Balance</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">No members found.</td></tr>}
              {rows.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.borrower_code}</td>
                  <td>{r.full_name}</td>
                  <td>৳{money(r.total_borrowed)}</td>
                  <td>৳{money(r.total_paid)}</td>
                  <td className="font-semibold">৳{money(r.outstanding_balance)}</td>
                  <td><span className={`badge border ${STATUS_STYLE[r.credit_status]}`}>{r.credit_status}</span></td>
                  <td className="whitespace-nowrap">
                    <Link href={`/reports?mode=single&borrower=${r.id}`} className="text-xs text-teal hover:underline mr-2">View</Link>
                    <Link href={`/borrowers/${r.id}/edit`} className="text-xs text-gray-400 hover:text-teal mr-2">Edit</Link>
                    <Link href={`/borrowers/${r.id}/edit`} className="text-xs text-red-400 hover:text-red-600">Delete</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-navy text-white px-5 py-3 flex flex-wrap justify-around gap-3 text-sm">
          <span><strong>Total Loan Amount:</strong> ৳{money(totals.borrowed)}</span>
          <span><strong>Total Paid:</strong> ৳{money(totals.paid)}</span>
          <span><strong>Total Remaining Balance:</strong> ৳{money(totals.outstanding)}</span>
        </div>
      </div>
    </div>
  );
}

function ModeSwitch({ mode }: { mode: string }) {
  return (
    <div className="flex gap-2 mb-4">
      <Link href="/reports?mode=all" className={`btn ${mode === 'all' ? 'btn-primary' : 'btn-outline'}`}>All Members Report</Link>
      <Link href="/reports?mode=single" className={`btn ${mode === 'single' ? 'btn-primary' : 'btn-outline'}`}>Single Member Report</Link>
    </div>
  );
}
