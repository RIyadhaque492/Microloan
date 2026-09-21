import Link from 'next/link';
import { getActiveLoansWithBalance, refreshOverdueInstallments } from '@/lib/data';
import { money } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Loan Collection - MicroLoan Admin' };

export default async function CollectionsPage({ searchParams }: { searchParams: { q?: string; error?: string } }) {
  await refreshOverdueInstallments();
  const loans = (await getActiveLoansWithBalance(searchParams.q)) as any[];
  const totalBalance = loans.reduce((s, l) => s + Number(l.balance), 0);

  return (
    <div>
      <PageHeader title="Loan Collection" showBack={false} />

      <form className="flex gap-2 mb-4 max-w-sm">
        <input name="q" defaultValue={searchParams.q} placeholder="Search member or loan code..." className="input" />
        <button className="btn btn-outline">Search</button>
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="card p-4 mb-4">
        <div className="text-xs text-gray-500">Total Balance Due Across All Loans</div>
        <div className="text-2xl font-bold text-navy">৳{money(totalBalance)}</div>
      </div>

      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Phone</th><th>Next Due</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            {loans.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-10">No outstanding collections.</td></tr>}
            {loans.map((l) => (
              <tr key={l.id}>
                <td>{l.borrower_code}</td>
                <td>{l.full_name}<div className="text-xs text-gray-400">{l.loan_code}</div></td>
                <td>{l.phone}</td>
                <td>{l.next_due ? new Date(l.next_due).toLocaleDateString() : '—'}</td>
                <td className="font-semibold">৳{money(l.balance)}</td>
                <td><Link href={`/collections/${l.id}`} className="btn btn-primary !py-1 !px-2 text-xs">Collect</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
