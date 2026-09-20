import Link from 'next/link';
import { getAllMembersSavings, getSiteSettings } from '@/lib/data';
import { money } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Member Savings - MicroLoan Admin' };

export default async function SavingsListPage({ searchParams }: { searchParams: { q?: string } }) {
  const rows = await getAllMembersSavings(searchParams.q);
  const settings = await getSiteSettings();
  const totalSavings = rows.reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div>
      <PageHeader title="Member Savings" showBack={false} />

      <div className="rounded-lg bg-tealight border border-teal-100 p-3 mb-4 text-sm flex items-center justify-between flex-wrap gap-2">
        <span>🏦 Savings are tracked separately from loans and never count toward loan/debt calculations.</span>
        <span className="font-semibold text-teal">Current rate: {Number(settings?.savings_interest_rate || 0)}% p.a.</span>
      </div>

      <form className="flex gap-2 mb-4 max-w-sm">
        <input name="q" defaultValue={searchParams.q} placeholder="Search member..." className="input" />
        <button className="btn btn-outline">Search</button>
      </form>

      <div className="card p-4 mb-4">
        <div className="text-xs text-gray-500">Total Savings Across All Members</div>
        <div className="text-2xl font-bold text-navy">৳{money(totalSavings)}</div>
      </div>

      <div className="table-wrap">
        <table className="app-table">
          <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Transactions</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-10">No members found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.borrower_code}</td>
                <td>{r.full_name}</td>
                <td>{r.phone}</td>
                <td>{r.transaction_count}</td>
                <td className="font-semibold">৳{money(r.balance)}</td>
                <td><Link href={`/savings/${r.id}`} className="btn btn-outline !py-1 !px-2 text-xs">Manage</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
