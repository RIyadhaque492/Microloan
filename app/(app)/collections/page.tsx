import Link from 'next/link';
import { getActiveLoansWithBalance, refreshOverdueInstallments } from '@/lib/data';
import { money, matchesIdGroup } from '@/lib/utils';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';

export const metadata = { title: 'Loan Collection - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function CollectionsPage({ searchParams }: { searchParams: { q?: string; d?: string; ids?: string; error?: string } }) {
  await refreshOverdueInstallments();
  const loans = ((await getActiveLoansWithBalance(searchParams.q, searchParams.d)) as any[]).filter((l) => matchesIdGroup(l.borrower_code, searchParams.ids));
  const totalBalance = loans.reduce((s, l) => s + Number(l.balance), 0);
  const dueCount = loans.filter((l) => l.needs_collection).length;
  const dateMode = !!searchParams.d;
  const dayTotal = loans.reduce((s, l) => s + Number(l.collected_on_date || 0), 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="Loan Collection" showBack={false} />

      <FilterBar basePath="/collections" q={searchParams.q} ids={searchParams.ids} showDates={false} qPlaceholder="Member or loan code...">
        <div>
          <label className="text-[11px] text-gray-500 block mb-0.5">Payment date</label>
          <input name="d" type="date" defaultValue={searchParams.d} className="input w-36" aria-label="Payment date" />
        </div>
      </FilterBar>

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

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
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
