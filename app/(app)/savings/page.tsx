import Link from 'next/link';
import { getAllMembersSavings, getAllSavingsTotals, getSavingsBorrowerIdsInRange, getSiteSettings, getBorrowersBasic, getSavingsNotesSuggestions } from '@/lib/data';
import { money, matchesIdGroup, formatDMY } from '@/lib/utils';
import FilterBar from '../FilterBar';
import PageHeader from '../PageHeader';
import SavingsQuickAdd from './SavingsQuickAdd';

export const metadata = { title: 'Member Savings - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function SavingsListPage({ searchParams }: { searchParams: { q?: string; ids?: string; from?: string; to?: string; added?: string; error?: string } }) {
  let rows = (await getAllMembersSavings(searchParams.q)).filter((r: any) => matchesIdGroup(r.borrower_code, searchParams.ids));
  if (searchParams.from || searchParams.to) {
    const inRange = await getSavingsBorrowerIdsInRange(searchParams.from, searchParams.to);
    rows = rows.filter((r: any) => inRange.has(Number(r.id)));
  }
  const settings = await getSiteSettings();
  const members = (await getBorrowersBasic()) as any[];
  const notesSuggestions = await getSavingsNotesSuggestions();
  const totals = await getAllSavingsTotals();
  const remaining = rows.reduce((s, r) => s + Number(r.balance), 0);

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="Member Savings" showBack={false} action={<SavingsQuickAdd members={members} notesSuggestions={notesSuggestions} />} />
      {searchParams.added && <div className="mb-3 rounded-lg bg-green-50 text-green-700 text-sm px-3 py-2 flex-shrink-0">✅ Savings saved (receipt {searchParams.added}).</div>}
      {searchParams.error && <div className="mb-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 flex-shrink-0">{searchParams.error}</div>}

      <div className="rounded-lg bg-tealight border border-teal-100 p-3 mb-4 text-sm flex items-center justify-between flex-wrap gap-2">
        <span>🏦 Savings are tracked separately from loans and never count toward loan/debt calculations.</span>
        <span className="font-semibold text-teal">Current rate: {Number(settings?.savings_interest_rate || 0)}% p.a.</span>
      </div>

      <FilterBar basePath="/savings" q={searchParams.q} ids={searchParams.ids} from={searchParams.from} to={searchParams.to} dateLabel="Savings" qPlaceholder="Search member..." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2 flex-shrink-0">
        <div className="card px-3 py-1.5 border-l-4 border-l-sky-500 bg-sky-50"><div className="text-base font-bold text-sky-800">৳{money(totals.deposit)}</div><div className="text-xs text-sky-700">Total Savings</div></div>
        <div className="card px-3 py-1.5 border-l-4 border-l-green-500 bg-green-50"><div className="text-base font-bold text-green-800">৳{money(totals.depositToday)}</div><div className="text-xs text-green-700">Deposit (Today)</div></div>
        <div className="card px-3 py-1.5 border-l-4 border-l-amber-500 bg-amber-50"><div className="text-base font-bold text-amber-800">৳{money(totals.withdrawToday)}</div><div className="text-xs text-amber-700">Withdraw (Today)</div></div>
        <div className="card px-3 py-1.5 border-l-4 border-l-purple-500 bg-purple-50"><div className="text-base font-bold text-purple-800">৳{money(remaining)}</div><div className="text-xs text-purple-700">Remaining Savings</div></div>
      </div>

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
        <table className="app-table">
          <thead><tr><th>Member ID</th><th>Name</th><th>Phone</th><th>Deposit</th><th>Withdraw</th><th>Remaining</th><th>Last Date</th><th></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-10">No members found.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.borrower_code}</td>
                <td>{r.full_name}</td>
                <td>{r.phone}</td>
                <td className="text-green-700 font-semibold">৳{money(r.total_deposit)}</td>
                <td className="text-amber-700 font-semibold">৳{money(r.total_withdraw)}</td>
                <td className="font-semibold text-purple-700">৳{money(r.balance)}</td>
                <td>{r.last_savings_date ? formatDMY(r.last_savings_date) : '—'}</td>
                <td className="whitespace-nowrap">
                  <Link href={`/savings/${r.id}`} className="btn btn-outline !py-1 !px-2 text-xs">View</Link>
                  {r.last_transaction_id ? (
                    <Link href={`/savings/${r.id}/edit/${r.last_transaction_id}`} className="btn btn-outline !py-1 !px-2 text-xs ml-1">Edit</Link>
                  ) : (
                    <span className="text-xs text-gray-300 ml-2" title="No receipts to edit yet">Edit</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
