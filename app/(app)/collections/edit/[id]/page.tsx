import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { updateCollectionAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Edit Payment - MicroLoan Admin' };

export default async function EditCollectionPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();

  const [collection] = await sql`
    SELECT c.*, b.full_name, l.loan_code FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id
    JOIN loans l ON l.id = c.loan_id
    WHERE c.id = ${id}
  `;
  if (!collection) notFound();

  const updateAction = updateCollectionAction.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Payment" />

      <div className="mb-4 rounded-lg bg-amber-50 text-amber-800 text-sm px-3 py-2">
        ⚠️ Editing this payment will recalculate the entire installment schedule for loan <strong>{collection.loan_code}</strong> by replaying every payment in date order. This is the correct way to fix a mistake, but double-check the result afterward.
      </div>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <form action={updateAction} className="card p-6 max-w-lg space-y-4">
        <div className="text-sm text-gray-500">
          <p><strong>Receipt:</strong> {collection.receipt_no}</p>
          <p><strong>Member:</strong> {collection.full_name}</p>
          <p><strong>Loan:</strong> {collection.loan_code}</p>
        </div>
        <div>
          <label className="label">Amount Paid (৳) *</label>
          <input name="amount_paid" type="number" step="0.01" required defaultValue={collection.amount_paid} className="input" />
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
          <input name="payment_date" type="date" defaultValue={new Date(collection.payment_date).toISOString().slice(0, 10)} className="input" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" defaultValue={collection.notes} className="input" rows={2} />
        </div>
        <button type="submit" className="btn btn-primary">Save & Recalculate</button>
      </form>
    </div>
  );
}
