import Link from 'next/link';
import { getBorrowersBasic, getLoanReportRows, getPaymentsForBorrower } from '@/lib/data';
import { money, buildSingleUserShareText, buildAllUsersShareText, matchesIdGroup, inDateRange } from '@/lib/utils';
import ExportButtons from './ExportButtons';
import RegisterTable from './RegisterTable';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Reports - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

function loanTotals(rows: any[]) {
  return {
    loanAmount: rows.reduce((s, r) => s + Number(r.loan_amount), 0),
    totalPayable: rows.reduce((s, r) => s + Number(r.total_payable), 0),
    totalPaid: rows.reduce((s, r) => s + Number(r.total_paid), 0),
    remaining: rows.reduce((s, r) => s + Number(r.remaining_balance), 0),
    savings: rows.reduce((s, r) => s + (r.savings_balance == null ? 0 : Number(r.savings_balance)), 0),
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
  searchParams: { mode?: string; borrower?: string; q?: string; ids?: string; from?: string; to?: string };
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
              <RegisterTable rows={loanRows} headColor="#0F2A3F" maxHeight="max-h-[45vh]" />

              <h3 className="font-semibold text-sm text-navy mt-6 mb-2">Payment History — every installment tracked individually</h3>
              <table className="app-table border-2 border-black">
                <thead className="[&_th]:text-center"><tr><th>SL</th><th>Receipt No.</th><th>Particulars</th><th>Date</th><th>Amount Paid</th><th>Remaining Balance</th></tr></thead>
                <tbody>
                  {orderedPayments.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No payments recorded.</td></tr>}
                  {(() => {
                    let running = 0;
                    return orderedPayments.map((p, i) => {
                      running += Number(p.amount_paid);
                      const remaining = Math.max(0, totals.totalPayable - running);
                      return (
                        <tr key={p.id} className="border border-black text-center font-bold bg-sky-50">
                          <td className="border border-black text-center font-bold bg-sky-50">{i + 1}</td>
                          <td className="border border-black text-center font-bold bg-sky-50">{p.receipt_no}</td>
                          <td className="border border-black text-center font-bold bg-sky-50">{p.notes || 'Installment'}</td>
                          <td className="border border-black text-center font-bold bg-sky-50">{fmtDate(p.payment_date)}</td>
                          <td className="border border-black text-center font-bold bg-sky-50">৳{money(p.amount_paid)}</td>
                          <td className="border border-black text-center font-bold bg-sky-50">৳{money(remaining)}</td>
                        </tr>
                      );
                    });
                  })()}
                  {orderedPayments.length > 0 && (() => {
                    const totalPaid = orderedPayments.reduce((s, p) => s + Number(p.amount_paid), 0);
                    const finalRemaining = Math.max(0, totals.totalPayable - totalPaid);
                    return (
                      <tr className="bg-tealight font-bold">
                        <td className="border border-black text-center font-bold bg-sky-50"></td>
                        <td className="border border-black text-center font-bold bg-sky-50"></td>
                        <td className="border border-black text-center font-bold bg-sky-50">TOTAL PAID</td>
                        <td className="border border-black text-center font-bold bg-sky-50"></td>
                        <td className="border border-black text-center font-bold bg-sky-50">৳{money(totalPaid)}</td>
                        <td className="border border-black text-center font-bold bg-sky-50">৳{money(finalRemaining)}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>

              <Link href={`/borrowers/${selected.id}`} className="btn btn-outline mt-4">View Full Member Profile</Link>
            </div>

          </div>
        )}
      </div>
    );
  }

  const loanRows = ((await getLoanReportRows({ search: searchParams.q })) as any[]).filter(
    (r) => matchesIdGroup(r.borrower_code, searchParams.ids) && inDateRange(r.disbursement_date, searchParams.from, searchParams.to)
  );
  const shareText = buildAllUsersShareText(loanRows);
  const totals = loanTotals(loanRows);

  return (
    <div>
      <PageHeader title="Reports" />
      <ModeSwitch mode={mode} />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <FilterBar basePath="/reports?mode=all" q={searchParams.q} ids={searchParams.ids} from={searchParams.from} to={searchParams.to} dateLabel="Disbursed" qPlaceholder="Member or loan...">
          <input type="hidden" name="mode" value="all" />
        </FilterBar>
        <ExportButtons mode="all" loanRows={loanRows} shareText={shareText} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
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
        <div className="rounded-xl border border-teal-300 p-4 col-span-2 md:col-span-1" style={{ backgroundColor: '#E6F6F5' }}>
          <div className="text-xs text-teal-700">Total Savings</div>
          <div className="text-lg font-bold" style={{ color: '#0A5A56' }}>৳{money(totals.savings)}</div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
        <div className="bg-gold text-white px-5 py-3 font-semibold text-sm" style={{ backgroundColor: '#d99a2b' }}>All Loans Register — {loanRows.length} loan(s)</div>
        <div className="p-3 bg-white">
          <RegisterTable rows={loanRows} headColor="#D99A2B" showActions maxHeight="max-h-[55vh]" />
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
