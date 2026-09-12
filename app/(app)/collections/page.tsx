import Link from 'next/link';
import { getActiveLoansWithBalance, getRecentPayments, refreshOverdueInstallments } from '@/lib/data';
import { money } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Loan Collection - MicroLoan Admin' };

export default async function CollectionsPage({ searchParams }: { searchParams: { q?: string; error?: string } }) {
  await refreshOverdueInstallments();
  const loans = await getActiveLoansWithBalance(searchParams.q);
  const recent = (await getRecentPayments()) as any[];

  return (
    <div>
      <PageHeader title="Loan Collection" />

      <form className="flex gap-2 mb-4 max-w-sm">
        <input name="q" defaultValue={searchParams.q} placeholder="Search borrower or loan code..." className="input" />
        <button className="btn btn-outline">Search</button>
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="table-wrap">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Active Loans With Balance Due</div>
          <table className="app-table">
            <thead><tr><th>Loan</th><th>Borrower</th><th>Next Due</th><th>Balance</th><th></th></tr></thead>
            <tbody>
              {loans.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No outstanding collections.</td></tr>}
              {loans.map((l: any) => (
                <tr key={l.id}>
                  <td><Link href={`/loans/${l.id}`} className="text-teal">{l.loan_code}</Link></td>
                  <td>{l.full_name}<div className="text-xs text-gray-400">{l.phone}</div></td>
                  <td>{l.next_due ? new Date(l.next_due).toLocaleDateString() : '—'}</td>
                  <td>৳{money(l.balance)}</td>
                  <td><Link href={`/collections/${l.id}`} className="btn btn-primary !py-1 !px-2 text-xs">Collect</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap h-fit">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Recent Payments</div>
          <table className="app-table">
            <thead><tr><th>Receipt</th><th>Borrower</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No payments yet.</td></tr>}
              {recent.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/collections/receipt/${p.id}`} className="text-teal">{p.receipt_no}</Link></td>
                  <td>{p.full_name}</td>
                  <td>৳{money(p.amount_paid)}</td>
                  <td><Link href={`/collections/edit/${p.id}`} className="btn btn-outline !py-1 !px-2 text-xs">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
