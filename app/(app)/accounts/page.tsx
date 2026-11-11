import Link from 'next/link';
import { getCashBook, getUsedCashCategories } from '@/lib/accounts';
import { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES } from '@/lib/cashCategories';
import { deleteCashEntryAction } from '@/lib/actions';
import { money, formatDMY, todayISO } from '@/lib/utils';
import DateInput from '@/app/(app)/DateInput';
import PageHeader from '../PageHeader';
import CashBookPdfButton from './CashBookPdfButton';

export const metadata = { title: 'Cash Book - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

type SP = { from?: string; to?: string; all?: string; cat?: string; q?: string; order?: string; error?: string };

function monthBounds(iso: string) {
  const [y, m] = iso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` };
}

export default async function CashBookPage({ searchParams }: { searchParams: SP }) {
  const today = todayISO();
  const thisMonth = monthBounds(today);
  const all = searchParams.all === '1';
  // default view = this month; "All time" shows everything from the very first entry
  const from = all ? '' : searchParams.from ?? (searchParams.to ? '' : thisMonth.from);
  const to = all ? '' : searchParams.to ?? (searchParams.from ? '' : thisMonth.to);
  const newestFirst = searchParams.order !== 'asc'; // latest date on top, like every other history

  const book = await getCashBook({ from, to, category: searchParams.cat, search: searchParams.q });
  const used = await getUsedCashCategories();
  const rows = newestFirst ? [...book.rows].reverse() : book.rows;

  // totals per category for the period shown
  const inBy = new Map<string, number>();
  const outBy = new Map<string, number>();
  for (const r of book.rows) {
    const m = r.dir === 'in' ? inBy : outBy;
    m.set(r.category, Math.round(((m.get(r.category) || 0) + r.amount) * 100) / 100);
  }

  const lastMonth = (() => { const [y, m] = today.split('-').map(Number); return monthBounds(new Date(y, m - 2, 1).toLocaleDateString('en-CA')); })();
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const quick = [
    ['Today', `/accounts?from=${today}&to=${today}`],
    ['This Month', '/accounts'],
    ['Last Month', `/accounts?from=${lastMonth.from}&to=${lastMonth.to}`],
    ['This Year', `/accounts?from=${yearStart}&to=${today.slice(0, 4)}-12-31`],
    ['All Time', '/accounts?all=1'],
  ];
  const categories = Array.from(new Set([...CASH_IN_CATEGORIES, ...CASH_OUT_CATEGORIES, ...used]));
  const periodLabel = all ? 'All time' : `${from ? formatDMY(from) : 'Start'}  to  ${to ? formatDMY(to) : 'Today'}`;
  const pdfRows = rows.map((r) => ({ d: r.d, particulars: r.particulars, category: r.category, cashIn: r.dir === 'in' ? r.amount : 0, cashOut: r.dir === 'out' ? r.amount : 0, balance: r.balance }));

  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader
        title="Cash Book"
        showBack={false}
        action={
          <div className="flex gap-2 flex-wrap">
            <Link href="/accounts/new?type=in" className="btn btn-success">⬇ Cash In</Link>
            <Link href="/accounts/new?type=out" className="btn btn-danger">⬆ Cash Out</Link>
            <CashBookPdfButton
              rows={pdfRows}
              summary={{ period: periodLabel, opening: book.opening, totalIn: book.totalIn, totalOut: book.totalOut, closing: book.closing, filtered: book.filtered }}
            />
          </div>
        }
      />
      {searchParams.error && <div className="mb-2 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 flex-shrink-0">{searchParams.error}</div>}

      <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
        {quick.map(([label, href]) => (
          <Link key={label} href={href} prefetch={false} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-navy hover:bg-tealight hover:border-teal-300 transition">{label}</Link>
        ))}
      </div>

      <form className="card p-3 mb-2 flex flex-wrap gap-3 items-end flex-shrink-0">
        <div><label className="label">From</label><DateInput name="from" defaultValue={from} className="input w-36" /></div>
        <div><label className="label">To</label><DateInput name="to" defaultValue={to} className="input w-36" /></div>
        <div>
          <label className="label">Category</label>
          <select name="cat" defaultValue={searchParams.cat || ''} className="input w-44">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div><label className="label">Search</label><input name="q" defaultValue={searchParams.q || ''} placeholder="Name, loan, note…" className="input w-44" /></div>
        <div>
          <label className="label">Order</label>
          <select name="order" defaultValue={newestFirst ? 'desc' : 'asc'} className="input w-36"><option value="desc">Newest first</option><option value="asc">Oldest first</option></select>
        </div>
        <button className="btn btn-primary">🔍 Show</button>
        {(searchParams.cat || searchParams.q) && <Link href="/accounts" className="btn btn-outline">Clear</Link>}
      </form>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2 flex-shrink-0">
        {book.filtered ? (
          <div className="card px-3 py-1.5 border-l-4 border-l-gray-400 bg-gray-50 lg:col-span-1"><div className="text-base font-bold text-gray-700">Filtered</div><div className="text-xs text-gray-500">Opening / closing hidden while filtering</div></div>
        ) : (
          <div className="card px-3 py-1.5 border-l-4 border-l-sky-500 bg-sky-50"><div className="text-base font-bold text-sky-800">৳{money(book.opening)}</div><div className="text-xs text-sky-700">Opening Balance (b/f)</div></div>
        )}
        <div className="card px-3 py-1.5 border-l-4 border-l-green-500 bg-green-50"><div className="text-base font-bold text-green-800">৳{money(book.totalIn)}</div><div className="text-xs text-green-700">Total Cash In</div></div>
        <div className="card px-3 py-1.5 border-l-4 border-l-red-500 bg-red-50"><div className="text-base font-bold text-red-800">৳{money(book.totalOut)}</div><div className="text-xs text-red-700">Total Cash Out</div></div>
        <div className="card px-3 py-1.5 border-l-4 border-l-purple-500 bg-purple-50">
          <div className="text-base font-bold text-purple-800">৳{money(book.filtered ? book.totalIn - book.totalOut : book.closing)}</div>
          <div className="text-xs text-purple-700">{book.filtered ? 'Net (In − Out)' : 'Closing Balance (cash in hand)'}</div>
        </div>
      </div>

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
        <table className="app-table">
          <thead>
            <tr>
              <th>Date</th><th>Particulars</th><th>Category</th>
              <th className="text-right">Cash In</th><th className="text-right">Cash Out</th>
              {!book.filtered && <th className="text-right">Balance</th>}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!newestFirst && !book.filtered && from && (
              <tr className="bg-sky-50 font-semibold"><td>{formatDMY(from)}</td><td colSpan={2}>Opening balance brought forward</td><td></td><td></td><td className="text-right">৳{money(book.opening)}</td><td></td></tr>
            )}
            {rows.length === 0 && <tr><td colSpan={book.filtered ? 6 : 7} className="text-center text-gray-400 py-10">No cash entries in this period.</td></tr>}
            {rows.map((r) => (
              <tr key={r.rid}>
                <td className="whitespace-nowrap">{formatDMY(r.d)}</td>
                <td>{r.particulars}</td>
                <td>
                  <span className={`badge ${r.dir === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{r.category}</span>
                </td>
                <td className="text-right font-semibold text-green-700">{r.dir === 'in' ? `৳${money(r.amount)}` : ''}</td>
                <td className="text-right font-semibold text-red-600">{r.dir === 'out' ? `৳${money(r.amount)}` : ''}</td>
                {!book.filtered && <td className="text-right font-semibold text-navy">৳{money(r.balance ?? 0)}</td>}
                <td className="whitespace-nowrap">
                  <Link href={`/accounts/${r.rid}/edit`} className="text-xs text-gray-500 hover:text-teal mr-2">Edit</Link>
                  <form action={deleteCashEntryAction.bind(null, r.rid)} className="inline">
                    <button className="text-xs text-red-500 hover:text-red-700 confirm-delete">🗑 Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {newestFirst && !book.filtered && from && rows.length > 0 && (
              <tr className="bg-sky-50 font-semibold"><td>{formatDMY(from)}</td><td colSpan={2}>Opening balance brought forward</td><td></td><td></td><td className="text-right">৳{money(book.opening)}</td><td></td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-50">
              <td colSpan={3} className="text-right">TOTAL</td>
              <td className="text-right text-green-700">৳{money(book.totalIn)}</td>
              <td className="text-right text-red-600">৳{money(book.totalOut)}</td>
              {!book.filtered && <td className="text-right text-navy">৳{money(book.closing)}</td>}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(inBy.size > 0 || outBy.size > 0) && (
        <details className="card mt-2 p-3 flex-shrink-0">
          <summary className="cursor-pointer font-semibold text-navy text-sm">📊 Summary by category — {periodLabel}</summary>
          <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm">
            {([['Cash In', inBy, 'text-green-700', book.totalIn], ['Cash Out', outBy, 'text-red-600', book.totalOut]] as const).map(([title, map, color, total]) => (
              <div key={title}>
                <div className={`font-bold mb-1 ${color}`}>{title}</div>
                {Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([cat, v]) => (
                  <div key={cat} className="flex justify-between border-b border-gray-100 py-1"><span>{cat}</span><span className="font-semibold">৳{money(v)}</span></div>
                ))}
                <div className={`flex justify-between pt-1 font-bold ${color}`}><span>Total</span><span>৳{money(total)}</span></div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
