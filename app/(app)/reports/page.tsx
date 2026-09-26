import Link from 'next/link';
import { getBorrowersBasic, getLoanReportRows, getPaymentsForBorrower } from '@/lib/data';
import { money, buildSingleUserShareText, buildAllUsersShareText } from '@/lib/utils';
import ExportButtons from './ExportButtons';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Reports - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

function loanTotals(rows: any[]) {
  return {
    loanAmount: rows.reduce((s, r) => s + Number(r.loan_amount), 0),
    totalPayable: rows.reduce((s, r) => s + Number(r.total_payable), 0),
    totalPaid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
    remaining: rows.reduce((s, r) => s + Number(r.remaining_balance), 0),
  };
}

function fmtDate(d: any) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { mode?: string; borrower?: string; q?: string };
}) {
  const mode = searchParams.mode === 'single' ? 'single' : 'all';

  if (mode === 'single') {
    const borrowerId = Number(searchParams.borrower || 0);
    const members = (await getBorrowersBasic()) as any[];
    const selected = borrowerId ? members.find((m) => m.id === borrowerId) : null;
    const loanRows = selected ? await getLoanReportRows({ borrowerId: selected.id }) : [];
    const payments = selected ? ((await getPaymentsForBorrower(selected.id)) as any[]) : [];
    const orderedPayments = [...payments].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    const shareText = selected ? buildSingleUserShareText(selected, loanRows) : '';
    const totals = loanTotals(loanRows);

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
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.borrower_code} — {m.full_name}</option>
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
              <ExportButtons mode="single" member={selected} loanRows={loanRows} payments={payments} shareText={shareText} onDark />
            </div>

            <div className="bg-white p-5">
              <h3 className="font-semibold text-sm text-navy mb-2">Loan Register</h3>
              <div className="overflow-x-auto">
                <table className="app-table text-xs">
                  <thead>
                    <tr>
                      <th>SL</th><th>Opening</th><th>Name</th><th>Member ID</th><th>Loan Amount</th>
                      <th>Total Payable</th><th>Installment Amt</th><th>Qty</th><th>Total Paid</th>
                      <th>Remaining Balance</th><th>Maturity Date</th><th>Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanRows.length === 0 && <tr><td colSpan={12} className="text-center text-gray-400 py-6">No disbursed loans.</td></tr>}
                    {loanRows.map((r: any, i: number) => (
                      <tr key={r.loan_id}>
                        <td>{i + 1}</td>
                        <td>{fmtDate(r.disbursement_date)}</td>
                        <td>{r.full_name}</td>
                        <td>{r.borrower_code}</td>
                        <td>৳{money(r.loan_amount)}</td>
                        <td>৳{money(r.total_payable)}</td>
                        <td>৳{money(r.installment_amount)}</td>
                        <td>{r.tenure}</td>
                        <td>৳{money(r.total_paid)}</td>
                        <td className="font-semibold">৳{money(r.remaining_balance)}</td>
                        <td>{fmtDate(r.maturity_date)}</td>
                        <td>{r.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                  {loanRows.length > 0 && (
                    <tfoot>
                      <tr className="bg-tealight font-bold">
                        <td colSpan={4} className="text-right">TOTAL</td>
                        <td>৳{money(totals.loanAmount)}</td>
                        <td>৳{money(totals.totalPayable)}</td>
                        <td colSpan={2}></td>
                        <td>৳{money(totals.totalPaid)}</td>
                        <td>৳{money(totals.remaining)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <h3 className="font-semibold text-sm text-navy mt-6 mb-2">Payment History — every installment tracked individually</h3>
              <table className="app-table border-2 border-black">
                <thead><tr><th>SL</th><th>Receipt No.</th><th>Particulars</th><th>Date</th><th>Amount Paid</th><th>Remaining Balance</th></tr></thead>
                <tbody>
                  {orderedPayments.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No payments recorded.</td></tr>}
                  {(() => {
                    let running = 0;
                    return orderedPayments.map((p, i) => {
                      running += Number(p.amount_paid);
                      const remaining = Math.max(0, totals.totalPayable - running);
                      return (
                        <tr key={p.id} className="border border-black">
                          <td className="border border-black">{i + 1}</td>
                          <td className="border border-black">{p.receipt_no}</td>
                          <td className="border border-black">{p.notes || 'Installment'}</td>
                          <td className="border border-black">{fmtDate(p.payment_date)}</td>
                          <td className="border border-black">৳{money(p.amount_paid)}</td>
                          <td className="border border-black">৳{money(remaining)}</td>
                        </tr>
                      );
                    });
                  })()}
                  {orderedPayments.length > 0 && (
                    <tr className="bg-tealight font-bold">
                      <td colSpan={4} className="text-right border border-black">TOTAL PAID</td>
                      <td className="border border-black">৳{money(orderedPayments.reduce((s, p) => s + Number(p.amount_paid), 0))}</td>
                      <td className="border border-black">৳{money(totals.remaining)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Link href={`/borrowers/${selected.id}`} className="btn btn-outline mt-4">View Full Member Profile</Link>
            </div>

            <div className="bg-navy text-white px-5 py-3 flex flex-wrap justify-around gap-3 text-sm">
              <span><strong>Loan Amount:</strong> ৳{money(totals.loanAmount)}</span>
              <span><strong>Total Payable:</strong> ৳{money(totals.totalPayable)}</span>
              <span><strong>Total Paid:</strong> ৳{money(totals.totalPaid)}</span>
              <span><strong>Remaining:</strong> ৳{money(totals.remaining)}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  const loanRows = await getLoanReportRows({ search: searchParams.q });
  const shareText = buildAllUsersShareText(loanRows);
  const totals = loanTotals(loanRows);

  return (
    <div>
      <PageHeader title="Reports" />
      <ModeSwitch mode={mode} />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <form className="flex gap-2">
          <input type="hidden" name="mode" value="all" />
          <input name="q" defaultValue={searchParams.q} placeholder="Search member or loan..." className="input max-w-xs" />
          <button className="btn btn-outline">Search</button>
        </form>
        <ExportButtons mode="all" loanRows={loanRows} shareText={shareText} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs text-sky-700">Total Loan Amount</div>
          <div className="text-lg font-bold text-navy">৳{money(totals.loanAmount)}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <div className="text-xs text-sky-700">Total Payable</div>
          <div className="text-lg font-bold text-navy">৳{money(totals.totalPayable)}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="text-xs text-green-700">Total Paid</div>
          <div className="text-lg font-bold text-green-800">৳{money(totals.totalPaid)}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="text-xs text-red-700">Total Remaining Balance</div>
          <div className="text-lg font-bold text-red-800">৳{money(totals.remaining)}</div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
        <div className="bg-gold text-white px-5 py-3 font-semibold text-sm" style={{ backgroundColor: '#d99a2b' }}>All Loans Register — {loanRows.length} loan(s)</div>
        <div className="table-wrap !rounded-none !border-0 overflow-x-auto">
          <table className="app-table text-xs">
            <thead>
              <tr>
                <th>SL</th><th>Opening</th><th>Name</th><th>Member ID</th><th>Loan Amount</th>
                <th>Total Payable</th><th>Installment Amt</th><th>Qty</th><th>Total Paid</th>
                <th>Remaining Balance</th><th>Maturity Date</th><th>Contact</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loanRows.length === 0 && <tr><td colSpan={13} className="text-center text-gray-400 py-10">No disbursed loans found.</td></tr>}
              {loanRows.map((r: any, i: number) => (
                <tr key={r.loan_id}>
                  <td>{i + 1}</td>
                  <td>{fmtDate(r.disbursement_date)}</td>
                  <td>{r.full_name}</td>
                  <td className="font-semibold">{r.borrower_code}</td>
                  <td>৳{money(r.loan_amount)}</td>
                  <td>৳{money(r.total_payable)}</td>
                  <td>৳{money(r.installment_amount)}</td>
                  <td>{r.tenure}</td>
                  <td>৳{money(r.total_paid)}</td>
                  <td className="font-semibold">৳{money(r.remaining_balance)}</td>
                  <td>{fmtDate(r.maturity_date)}</td>
                  <td>{r.phone}</td>
                  <td className="whitespace-nowrap">
                    <Link href={`/reports?mode=single&borrower=${r.borrower_id}`} className="text-xs text-teal hover:underline mr-2">View</Link>
                    <Link href={`/loans/${r.loan_id}`} className="text-xs text-gray-400 hover:text-teal">Loan</Link>
                  </td>
                </tr>
              ))}
            </tbody>
            {loanRows.length > 0 && (
              <tfoot>
                <tr className="bg-tealight font-bold">
                  <td colSpan={4} className="text-right">TOTAL</td>
                  <td>৳{money(totals.loanAmount)}</td>
                  <td>৳{money(totals.totalPayable)}</td>
                  <td colSpan={2}></td>
                  <td>৳{money(totals.totalPaid)}</td>
                  <td>৳{money(totals.remaining)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="bg-navy text-white px-5 py-3 flex flex-wrap justify-around gap-3 text-sm">
          <span><strong>Total Loan Amount:</strong> ৳{money(totals.loanAmount)}</span>
          <span><strong>Total Payable:</strong> ৳{money(totals.totalPayable)}</span>
          <span><strong>Total Paid:</strong> ৳{money(totals.totalPaid)}</span>
          <span><strong>Total Remaining Balance:</strong> ৳{money(totals.remaining)}</span>
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
