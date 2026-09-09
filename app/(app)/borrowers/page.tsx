import Link from 'next/link';
import { getBorrowers } from '@/lib/data';
import { statusBadgeClass } from '@/lib/utils';
import PageHeader from '../PageHeader';

export default async function BorrowersPage({ searchParams }: { searchParams: { q?: string; error?: string } }) {
  const borrowers = (await getBorrowers(searchParams.q)) as any[];

  return (
    <div>
      <PageHeader title="All Borrowers" action={<Link href="/borrowers/new" className="btn btn-primary">➕ Add Borrower</Link>} />

      <form className="flex gap-2 mb-4">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name, phone, NID..." className="input max-w-xs" />
        <button className="btn btn-outline">Search</button>
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Loans</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {borrowers.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-10">No borrowers found.</td></tr>}
            {borrowers.map((b) => (
              <tr key={b.id}>
                <td>{b.borrower_code}</td>
                <td>{b.full_name}</td>
                <td>{b.phone}</td>
                <td>{b.loan_count}</td>
                <td><span className={`badge ${statusBadgeClass(b.status)}`}>{b.status}</span></td>
                <td className="text-right flex gap-1 justify-end">
                  <Link href={`/borrowers/${b.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link>
                  <Link href={`/borrowers/${b.id}/edit`} className="btn btn-outline !py-1 !px-2 text-xs">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
