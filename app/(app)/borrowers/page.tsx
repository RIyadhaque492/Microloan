import Link from 'next/link';
import { getBorrowers } from '@/lib/data';
import { statusBadgeClass } from '@/lib/utils';
import { deleteBorrowerAction } from '@/lib/actions';
import PageHeader from '../PageHeader';

export const metadata = { title: 'All Members - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function BorrowersPage({ searchParams }: { searchParams: { q?: string; error?: string } }) {
  const borrowers = (await getBorrowers(searchParams.q)) as any[];

  return (
    <div>
      <PageHeader title="All Members" showBack={false} action={<Link href="/borrowers/new" className="btn btn-primary">➕ Add Member</Link>} />

      <form className="flex gap-2 mb-4 max-w-sm">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name, phone, NID..." className="input" />
        <button className="btn btn-outline">Search</button>
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Joining Date</th><th>Name</th><th>Phone</th><th>Loans</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {borrowers.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">No members found.</td></tr>}
            {borrowers.map((b) => (
              <tr key={b.id} className={b.overdue_count > 0 ? 'row-overdue' : ''}>
                <td>{b.borrower_code}</td>
                <td>{new Date(b.created_at).toLocaleDateString()}</td>
                <td>{b.full_name}</td>
                <td>{b.phone}</td>
                <td>{b.loan_count}</td>
                <td>
                  <span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span>
                  {b.overdue_count > 0 && <span className="badge bg-red-100 text-red-700 ml-1">⚠ Overdue</span>}
                </td>
                <td className="text-right whitespace-nowrap">
                  <Link href={`/borrowers/${b.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link>
                  <form action={deleteBorrowerAction.bind(null, b.id)} className="inline">
                    <button className="btn btn-danger-outline !py-1 !px-2 text-xs ml-1 confirm-delete">🗑 Remove</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
