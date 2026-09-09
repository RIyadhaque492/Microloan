import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { updateCollectionAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';

export default async function EditCollectionPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  const [collection] = await sql`
    SELECT c.*, b.full_name, l.loan_code FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id
    JOIN loans l ON l.id = c.loan_id
    WHERE c.id = ${id}
  `;
  if (!collection) notFound();

  const action = updateCollectionAction.bind(null, id);
  const dateValue = new Date(collection.payment_date).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader title="Edit Payment" />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <div className="card p-4 mb-4 text-sm max-w-xl">
        <p className="text-gray-500">Receipt: <strong className="text-navy">{collection.receipt_no}</strong></p>
        <p className="text-gray-500">Borrower: <strong className="text-navy">{collection.full_name}</strong></p>
        <p className="text-gray-500">Loan: <strong className="text-navy">{collection.loan_code}</strong></p>
      </div>

      <div className="mb-4 rounded-lg bg-amber-50 text-amber-800 text-sm px-3 py-2 max-w-xl">
        ⚠️ Changing the amount will automatically recalculate this loan's entire installment schedule
        (all payments for this loan are replayed in date order using the new amount).
      </div>

      <form action={action} className="card p-6 max-w-xl space-y-5">
        <div>
          <label className="label">Amount Paid (৳) *</label>
          <input name="amount_paid" type="number" step="0.01" defaultValue={collection.amount_paid} required className="input" />
        </div>
        <div>
          <label className="label">Payment Method</label>
          <select name="payment_method" defaultValue={collection.payment_method} className="input">
            <option value="cash">Cash</option>
            <option value="bank">Bank Transfer</option>
            <option value="mobile_banking">Mobile Banking</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Payment Date</label>
          <input name="payment_date" type="date" defaultValue={dateValue} className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" defaultValue={collection.notes} className="input" rows={2} />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
