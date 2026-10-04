import Link from 'next/link';
import { getActiveLoansWithBalance, refreshOverdueInstallments } from '@/lib/data';
import { money } from '@/lib/utils';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Loan Collection - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function CollectionsPage({ searchParams }: { searchParams: { q?: string; d?: string; error?: string } }) {
  await refreshOverdueInstallments();
  const loans = (await getActiveLoansWithBalance(searchParams.q, searchParams.d)) as any[];
  const totalBalance = loans.reduce((s, l) => s + Number(l.balance), 0);
  const dueCount = loans.filter((l) => l.needs_collection).length;
  const dateMode = !!searchParams.d;
  const dayTotal = loans.reduce((s, l) => s + Number(l.collected_on_date || 0), 0);

  return (
    <div>
      <PageHeader title="Loan Collection" showBack={false} />

      <form className="flex gap-2 flex-wrap mb-4">
        <input name="q" defaultValue={searchParams.q} placeholder="Search member or loan code..." className="input max-w-xs" />
        <input name="d" type="date" defaultValue={searchParams.d} className="input max-w-[170px]" aria-label="Payment date" />
        <button className="btn btn-primary">🔍 Search</button>
        {(searchParams.q || searchParams.d) && <Link href="/collections" className="btn btn-outline">Clear</Link>}
      </form>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="card p-4 border-l-4 border-l-red-500 bg-red-50">
          <div className="text-xs text-red-700">{dateMode ? 'Remaining Balance (these loans)' : 'Total Remaining Balance'}</div>
          <div className="text-xl font-bold text-red-800">৳{money(totalBalance)}</div>
        </div>
        {dateMode ? (
          <div className="card p-4 border-l-4 border-l-green-500 bg-green-50">
            <div className="text-xs text-green-700">Collected on {new Date(searchParams.d + 'T00:00:00').toLocaleDateString()}</div>
            <div className="text-xl font-bold text-green-800">৳{money(dayTotal)}</div>
          </div>
        ) : (
          <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50">
            <div className="text-xs text-amber-700">Waiting to be collected</div>
            <div className="text-xl font-bold text-amber-800">{dueCount} loan{dueCount !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      <div className="table-wrap !max-h-[calc(100dvh-17rem)] lg:!max-h-[calc(100dvh-15rem)] overflow-y-auto [&_thead_th]:sticky [&_thead_th]:top-0">
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Last Payment Date</th><th>Total Paid</th><th>Remaining Balance</th><th>Collect</th><th></th></tr></thead>
          <tbody>
            {loans.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">{dateMode ? 'No payments on that date.' : 'No outstanding collections.'}</td></tr>}
            {loans.map((l) => {
              const collectedAmount = dateMode ? Number(l.collected_on_date) : Number(l.last_payment_amount || 0);
              return (
                <tr key={l.id} className={l.needs_collection && l.due_now > 0 ? 'row-overdue' : ''}>
                  <td>{l.borrower_code}</td>
                  <td>{l.full_name}<div className="text-xs text-gray-400">{l.loan_code}</div></td>
                  <td>{l.last_payment_date ? new Date(l.last_payment_date).toLocaleDateString() : '—'}</td>
                  <td className="text-green-700 font-semibold">৳{money(l.total_paid)}</td>
                  <td className="font-semibold text-red-600">৳{money(l.balance)}</td>
                  <td className="whitespace-nowrap">
                    {l.needs_collection ? (
                      <Link href={`/collections/${l.id}`} className="btn !py-1 !px-3 text-xs !bg-red-600 !text-white hover:!bg-red-700">💵 Collect</Link>
                    ) : (
                      <div className="inline-flex flex-col items-center">
                        <Link href={`/collections/${l.id}`} className="btn !py-1 !px-3 text-xs !bg-green-600 !text-white hover:!bg-green-700">✓ Collected</Link>
                        <span className="text-[11px] font-semibold text-green-700 mt-0.5">৳{money(collectedAmount)}</span>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link href={`/collections/history/${l.id}`} className="btn btn-outline !py-1 !px-2 text-xs mr-1">View</Link>
                    <Link href={`/loans/${l.id}/edit`} className="text-xs text-gray-400 hover:text-teal">Edit</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
