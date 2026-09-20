import { notFound } from 'next/navigation';
import { getBorrower, getSavingsBalance, getSavingsTransactions, getSiteSettings } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import { recordSavingsTransactionAction, deleteSavingsTransactionAction } from '@/lib/actions';
import PageHeader from '../../PageHeader';

export const metadata = { title: 'Member Savings - MicroLoan Admin' };

export default async function MemberSavingsPage({ params, searchParams }: { params: { borrowerId: string }; searchParams: { error?: string } }) {
  const id = Number(params.borrowerId);
  if (!id || isNaN(id)) notFound();
  const borrower = await getBorrower(id);
  if (!borrower) notFound();

  const balance = await getSavingsBalance(id);
  const transactions = (await getSavingsTransactions(id)) as any[];
  const settings = await getSiteSettings();

  const recordAction = recordSavingsTransactionAction.bind(null, id);

  return (
    <div>
      <PageHeader title={`${borrower.full_name}'s Savings`} />

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 text-center">
            <div className="text-xs text-gray-500 mb-1">Current Savings Balance</div>
            <div className="text-3xl font-bold text-teal">৳{money(balance)}</div>
            <p className="text-xs text-gray-400 mt-2">Interest rate reference: {Number(settings?.savings_interest_rate || 0)}% p.a.</p>
            <span className={`badge ${statusBadgeClass(borrower.status)} mt-2 inline-block`}>{borrower.full_name}</span>
          </div>

          <form action={recordAction} className="card p-5 space-y-3">
            <h3 className="font-semibold text-sm text-navy">Record Transaction</h3>
            <div>
              <label className="label">Type</label>
              <select name="type" className="input" defaultValue="deposit">
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="label">Amount (৳) *</label>
              <input name="amount" type="number" step="0.01" required className="input" />
            </div>
            <div>
              <label className="label">Date</label>
              <input name="transaction_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input name="notes" className="input" placeholder="Optional" />
            </div>
            <button type="submit" className="btn btn-primary w-full">Save Transaction</button>
          </form>
        </div>

        <div className="lg:col-span-2">
          <div className="table-wrap">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Transaction History</div>
            <table className="app-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {transactions.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-8">No transactions yet.</td></tr>}
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td><span className={`badge ${statusBadgeClass(t.type)}`}>{t.type}</span></td>
                    <td className={t.type === 'deposit' ? 'text-green-700' : 'text-amber-700'}>
                      {t.type === 'deposit' ? '+' : '-'}৳{money(t.amount)}
                    </td>
                    <td className="text-gray-500">{t.notes || '—'}</td>
                    <td>
                      <form action={deleteSavingsTransactionAction.bind(null, id, t.id)}>
                        <button type="submit" className="text-xs text-red-400 hover:text-red-600 confirm-delete">🗑</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
