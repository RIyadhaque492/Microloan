import Link from 'next/link';
import { getLoans } from '@/lib/data';
import { money, statusBadgeClass, matchesIdGroup, inDateRange } from '@/lib/utils';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';

export const metadata = { title: 'All Loans - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

const STATUSES = ['pending', 'approved', 'active', 'completed', 'rejected', 'defaulted'];

export default async function LoansPage({ searchParams }: { searchParams: { q?: string; status?: string; ids?: string; from?: string; to?: string; error?: string } }) {
  const loans = ((await getLoans(searchParams.q, searchParams.status)) as any[]).filter(
    (l) => matchesIdGroup(l.borrower_code, searchParams.ids) && inDateRange(l.disbursement_date, searchParams.from, searchParams.to)
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="All Loans" showBack={false} action={<Link href="/loans/new" className="btn btn-primary">🆕 New Loan</Link>} />

      <FilterBar basePath="/loans" q={searchParams.q} ids={searchParams.ids} from={searchParams.from} to={searchParams.to} dateLabel="Disbursed" qPlaceholder="Loan code, member...">
        <div>
          <label className="text-[11px] text-gray-500 block mb-0.5">Status</label>
          <select name="status" defaultValue={searchParams.status || ''} className="input w-36">
            <option value="">All Statuses</option>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </FilterBar>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
        <table className="app-table">
          <thead>
            <tr>
              <th>Loan Code</th><th>Member</th><th>Loan Amount</th><th>Disbursement Date</th><th>Total Payable</th><th>Total Paid</th>
              <th>Remaining Balance</th><th>Tenure</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 && <tr><td colSpan={10} className="text-center text-gray-400 py-10">No loans found.</td></tr>}
            {loans.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td>
                <td>{l.full_name} <span className="text-xs text-gray-400">({l.borrower_code})</span><div className="text-xs text-gray-400">{l.phone}</div></td>
                <td className="font-semibold text-navy">৳{money(l.loan_amount)}</td>
                <td>{l.disbursement_date ? new Date(l.disbursement_date).toLocaleDateString() : '—'}</td>
                <td>৳{money(l.total_payable)}</td>
                <td className="text-green-700 font-semibold">৳{money(l.total_paid)}</td>
                <td className="font-semibold text-red-600">৳{money(l.remaining_balance)}</td>
                <td>{l.paid_count}/{l.total_count} paid</td>
                <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                <td className="whitespace-nowrap text-right">
                  <Link href={`/loans/${l.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
