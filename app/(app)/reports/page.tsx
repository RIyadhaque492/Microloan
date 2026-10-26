import Link from 'next/link';
import { getBorrowersBasic, getLoanReportRows, getPaymentsForBorrower } from '@/lib/data';
import { money, buildSingleUserShareText, buildAllUsersShareText, matchesIdGroup, inDateRange, formatDMY, formatDMYTime } from '@/lib/utils';
import ExportButtons from './ExportButtons';
import { SingleReportBody, AllReportBody } from './ReportView';
import MemberPicker from './MemberPicker';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';
import DateInput from '@/app/(app)/DateInput';

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
  return formatDMY(d);
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
    const allPayments = selected ? ((await getPaymentsForBorrower(selected.id)) as any[]) : [];
    const totals = loanTotals(loanRows);
    // Oldest first (receipt order within a day); the running balance is worked out on the FULL history so a
    // date-filtered report still shows the true remaining balance after each payment.
    const fullOrdered = [...allPayments].sort(
      (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime() || Number(a.id) - Number(b.id)
    );
    let runningAll = 0;
    const withBalance = fullOrdered.map((p) => {
      runningAll += Number(p.amount_paid);
      return { ...p, remaining_after: Math.max(0, totals.totalPayable - runningAll) };
    });
    const orderedPayments = withBalance.filter((p) => inDateRange(p.payment_date, searchParams.from, searchParams.to));
    const payments = orderedPayments;
    const shareText = selected ? buildSingleUserShareText(selected, loanRows) : '';

    return (
      <div>
        <PageHeader title="Reports" action={<ModeSwitch mode={mode} />} />

        <form className="card p-3 mb-3 flex flex-wrap gap-3 items-end">
          <input type="hidden" name="mode" value="single" />
          <MemberPicker members={members} defaultId={borrowerId || undefined} />
          <div>
            <label className="label">Payment date from</label>
            <DateInput name="from" defaultValue={searchParams.from} className="input w-40" />
          </div>
          <div>
            <label className="label">Payment date to</label>
            <DateInput name="to" defaultValue={searchParams.to} className="input w-40" />
          </div>
          <button className="btn btn-primary">🔍 View Report</button>
          {(searchParams.from || searchParams.to) && borrowerId > 0 && (
            <Link href={`/reports?mode=single&borrower=${borrowerId}`} className="btn btn-outline">Clear dates</Link>
          )}
        </form>

        {selected && (
          <div className="rounded-xl border-2 border-navy/10 overflow-hidden">
            <div className="bg-navy text-white px-4 py-2.5 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="font-bold text-lg">Member Credit / Debt Report</h2>
                <p className="text-teal-100 text-xs opacity-90">Generated: {formatDMYTime()}</p>
              </div>
              <ExportButtons mode="single" member={selected} loanRows={loanRows} payments={payments} shareText={shareText} onDark />
            </div>

            <div className="bg-white p-3">
              <SingleReportBody rows={loanRows} payments={orderedPayments} totals={totals} />

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
      <PageHeader title="Reports" action={<ModeSwitch mode={mode} />} />

      <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
        <FilterBar basePath="/reports?mode=all" q={searchParams.q} ids={searchParams.ids} from={searchParams.from} to={searchParams.to} dateLabel="Disbursed" qPlaceholder="Member or loan...">
          <input type="hidden" name="mode" value="all" />
        </FilterBar>
        <ExportButtons mode="all" loanRows={loanRows} shareText={shareText} />
      </div>

      <AllReportBody rows={loanRows} totals={totals} showActions />
    </div>
  );
}

function ModeSwitch({ mode }: { mode: string }) {
  return (
    <div className="flex gap-2">
      <Link href="/reports?mode=all" className={`btn !py-1.5 !px-3 text-sm ${mode === 'all' ? 'btn-primary' : 'btn-outline'}`}>All Members Report</Link>
      <Link href="/reports?mode=single" className={`btn !py-1.5 !px-3 text-sm ${mode === 'single' ? 'btn-primary' : 'btn-outline'}`}>Single Member Report</Link>
    </div>
  );
}
