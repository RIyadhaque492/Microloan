import Link from 'next/link';
import { getLoans } from '@/lib/data';
import { money, statusBadgeClass, frequencyShortLabel } from '@/lib/utils';
import PageHeader from '../PageHeader';

const STATUSES = ['pending', 'approved', 'active', 'completed', 'rejected', 'defaulted'];

export default async function LoansPage({ searchParams }: { searchParams: { q?: string; status?: string; error?: string } }) {
  const loans = (await getLoans(searchParams.q, searchParams.status)) as any[];

  return (
    <div>
      <PageHeader title="All Loans" action={<Link href="/loans/new" className="btn btn-primary">🆕 New Loan</Link>} />

      <form className="flex gap-2 flex-wrap mb-4">
        <input name="q" defaultValue={searchParams.q} placeholder="Search loan code, borrower..." className="input max-w-xs" />
        <select name="status" defaultValue={searchParams.status || ''} className="input max-w-[160px]">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-outline">Search</button>
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Loan Code</th><th>Borrower</th><th>Amount</th><th>Tenure</th><th>Progress</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loans.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">No loans found.</td></tr>}
            {loans.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td>
                <td>{l.full_name}<div className="text-xs text-gray-400">{l.phone}</div></td>
                <td>৳{money(l.loan_amount)}</td>
                <td>{l.tenure} {frequencyShortLabel(l.repayment_frequency)}</td>
                <td>{l.paid_count}/{l.total_count} paid</td>
                <td><span className={`badge ${statusBadgeClass(l.status)}`}>{l.status}</span></td>
                <td><Link href={`/loans/${l.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
