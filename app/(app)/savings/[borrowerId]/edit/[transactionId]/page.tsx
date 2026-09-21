import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { editSavingsTransactionAction } from '@/lib/actions';
import PageHeader from '../../../../PageHeader';

export const metadata = { title: 'Edit Savings Transaction - MicroLoan Admin' };

export default async function EditSavingsTransactionPage({
  params,
}: {
  params: { borrowerId: string; transactionId: string };
}) {
  const borrowerId = Number(params.borrowerId);
  const transactionId = Number(params.transactionId);
  if (!borrowerId || isNaN(borrowerId) || !transactionId || isNaN(transactionId)) notFound();

  const [transaction] = await sql`
    SELECT st.*, b.full_name FROM savings_transactions st
    JOIN borrowers b ON b.id = st.borrower_id
    WHERE st.id = ${transactionId} AND st.borrower_id = ${borrowerId}
  `;
  if (!transaction) notFound();

  const updateAction = editSavingsTransactionAction.bind(null, borrowerId, transactionId);

  return (
    <div>
      <PageHeader title="Edit Savings Transaction" />

      <form action={updateAction} className="card p-6 max-w-lg space-y-4">
        <p className="text-sm text-gray-500">Member: <strong>{transaction.full_name}</strong></p>
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue={transaction.type} className="input">
            <option value="deposit">Deposit</option>
            <option value="withdrawal">Withdrawal</option>
          </select>
        </div>
        <div>
          <label className="label">Amount (৳) *</label>
          <input name="amount" type="number" step="0.01" required defaultValue={transaction.amount} className="input" />
        </div>
        <div>
          <label className="label">Date</label>
          <input name="transaction_date" type="date" defaultValue={new Date(transaction.transaction_date).toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <input name="notes" defaultValue={transaction.notes} className="input" />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
