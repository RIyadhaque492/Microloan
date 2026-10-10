import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBorrower, getSavingsBalance, getSavingsSummary, getSavingsTransactions, getSiteSettings, getSavingsNotesSuggestions } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import { recordSavingsTransactionAction, deleteSavingsTransactionAction } from '@/lib/actions';
import BackLink from '../../BackLink';

export const metadata = { title: 'Member Savings - MicroLoan Admin' };

export default async function MemberSavingsPage({ params, searchParams }: { params: { borrowerId: string }; searchParams: { error?: string } }) {
  const id = Number(params.borrowerId);
  if (!id || isNaN(id)) notFound();
  const borrower = await getBorrower(id);
  if (!borrower) notFound();

  const balance = await getSavingsBalance(id);
  const summary = await getSavingsSummary(id);
  const transactions = (await getSavingsTransactions(id)) as any[];
  const settings = await getSiteSettings();
  const notesSuggestions = await getSavingsNotesSuggestions();

  const recordAction = recordSavingsTransactionAction.bind(null, id);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div className="flex items-center gap-3">
          <BackLink />
          <div>
            <h1 className="text-lg font-bold text-navy">{borrower.full_name}&apos;s Savings</h1>
            <p className="text-gray-500 text-sm">
              Member: <Link href={`/borrowers/${id}`} className="text-teal">{borrower.full_name}</Link> ({borrower.borrower_code}) — {borrower.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href={`/borrowers/${id}`} className="btn btn-outline">👤 Member Profile</Link>
          <Link href="/savings" prefetch={false} className="btn btn-outline">✔ Done</Link>
        </div>
      </div>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="card p-4 border-l-4 border-l-green-500 bg-green-50"><div className="text-lg font-bold text-green-800">৳{money(summary.deposit)}</div><div className="text-xs text-green-700">Total Deposit</div></div>
        <div className="card p-4 border-l-4 border-l-amber-500 bg-amber-50"><div className="text-lg font-bold text-amber-800">৳{money(summary.withdraw)}</div><div className="text-xs text-amber-700">Total Withdraw</div></div>
        <div className="card p-4 border-l-4 border-l-purple-500 bg-purple-50"><div className="text-lg font-bold text-purple-800">৳{money(balance)}</div><div className="text-xs text-purple-700">Remaining Savings</div></div>
        <div className="card p-4 border-l-4 border-l-sky-500 bg-sky-50"><div className="text-lg font-bold text-sky-800">{summary.lastDate ? new Date(summary.lastDate).toLocaleDateString() : '—'}</div><div className="text-xs text-sky-700">Last Savings Date</div></div>
        <div className="card p-4 border-l-4 border-l-red-500 bg-red-50 col-span-2 lg:col-span-1"><div className="text-lg font-bold text-red-800">{summary.receipts}</div><div className="text-xs text-red-700">Receipts · {Number(settings?.savings_interest_rate || 0)}% p.a.</div></div>
      </div>

      {/* Details — lower section */}
      <div className="space-y-4">
        <div>
          <form action={recordAction} className="card p-4 flex flex-wrap items-end gap-3">
            <h3 className="font-semibold text-sm text-navy w-full">Add Receipt</h3>
            <div className="w-36">
              <label className="label">Type</label>
              <select name="type" className="input" defaultValue="deposit">
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div className="w-40">
              <label className="label">Amount (৳) *</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div className="w-40">
              <label className="label">Date</label>
              <input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="label">Notes</label>
              <input name="notes" className="input" placeholder="Optional" list="savings-notes-suggestions" />
              <datalist id="savings-notes-suggestions">
                {notesSuggestions.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
            <button type="submit" className="btn btn-primary h-[42px] px-6">💾 Save Receipt</button>
          </form>
        </div>

        <div>
          <div className="table-wrap">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm flex justify-between items-center">
              <span>Receipt History</span>
              <span className="text-xs text-gray-400 font-normal">📞 {borrower.phone}</span>
            </div>
            <table className="app-table">
              <thead><tr><th>SL</th><th>Receipt No.</th><th>Date</th><th>Type</th><th>Amount</th><th>Net Balance</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {transactions.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-8">No receipts yet.</td></tr>}
                {(() => {
                  let running = 0;
                  return transactions.map((t, i) => {
                    running += t.type === 'deposit' ? Number(t.amount) : -Number(t.amount);
                    return (
                      <tr key={t.id}>
                        <td>{i + 1}</td>
                        <td>{t.receipt_no || '—'}</td>
                        <td>{new Date(t.transaction_date).toLocaleDateString()}</td>
                        <td><span className={`badge ${statusBadgeClass(t.type)}`}>{t.type}</span></td>
                        <td className={t.type === 'deposit' ? 'text-green-700' : 'text-amber-700'}>
                          {t.type === 'deposit' ? '+' : '-'}৳{money(t.amount)}
                        </td>
                        <td className="font-semibold">৳{money(running)}</td>
                        <td className="text-gray-500">{t.notes || '—'}</td>
                        <td className="whitespace-nowrap">
                          <Link href={`/savings/${id}/edit/${t.id}`} className="text-xs text-gray-400 hover:text-teal mr-2">Edit</Link>
                          <form action={deleteSavingsTransactionAction.bind(null, id, t.id)} className="inline">
                            <button type="submit" className="text-xs text-red-400 hover:text-red-600 confirm-delete">Delete</button>
                          </form>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
