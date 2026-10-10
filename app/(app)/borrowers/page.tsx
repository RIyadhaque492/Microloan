import Link from 'next/link';
import { getBorrowers } from '@/lib/data';
import { statusBadgeClass, matchesIdGroup, inDateRange } from '@/lib/utils';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';

export const metadata = { title: 'All Members - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function BorrowersPage({ searchParams }: { searchParams: { q?: string; ids?: string; from?: string; to?: string; error?: string } }) {
  const borrowers = ((await getBorrowers(searchParams.q)) as any[]).filter(
    (b) => matchesIdGroup(b.borrower_code, searchParams.ids) && inDateRange(b.created_at, searchParams.from, searchParams.to)
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="All Members" showBack={false} action={<Link href="/borrowers/new" className="btn btn-primary">➕ Add Member</Link>} />

      <FilterBar basePath="/borrowers" q={searchParams.q} ids={searchParams.ids} from={searchParams.from} to={searchParams.to} dateLabel="Joined" qPlaceholder="Name, phone, NID..." />

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
