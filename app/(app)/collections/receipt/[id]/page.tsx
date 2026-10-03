import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { money } from '@/lib/utils';
import ReceiptExportButtons from './ReceiptExportButtons';
import PageHeader from '../../../PageHeader';
import { deleteCollectionAction } from '@/lib/actions';

export const metadata = { title: 'Payment Receipt - MicroLoan Admin' };

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();
  const [p] = await sql`
    SELECT c.*, b.full_name, b.phone, b.borrower_code, l.loan_code
    FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id
    JOIN loans l ON l.id = c.loan_id
    WHERE c.id = ${id}
  `;
  if (!p) notFound();

  const shareText = [
    `*MicroLoan Payment Receipt*`,
    `Receipt No: ${p.receipt_no}`,
    `Date: ${new Date(p.payment_date).toLocaleDateString()}`,
    `Member: ${p.full_name} (${p.borrower_code})`,
    `Loan Code: ${p.loan_code}`,
    `Amount Paid: ৳${money(p.amount_paid)}`,
    `Method: ${p.payment_method}`,
  ].join('\n');

  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="Payment Receipt" />
      <div className="card p-6 text-center border-2 border-navy/20">
        <div className="text-3xl mb-1">💰</div>
        <h2 className="font-bold text-navy">MicroLoan Admin</h2>
        <p className="text-gray-400 text-sm mb-4">Payment Receipt</p>

        <div className="text-left text-sm space-y-2">
          <Row label="Receipt No." value={p.receipt_no} />
          <Row label="Date" value={new Date(p.payment_date).toLocaleDateString()} />
          <Row label="Member" value={`${p.full_name} (${p.borrower_code})`} />
          <Row label="Loan Code" value={p.loan_code} />
          <Row label="Method" value={p.payment_method} />
          {p.notes && <Row label="Notes" value={p.notes} />}
        </div>

        <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3 my-4 border border-teal/30">
          <span className="font-semibold">Amount Paid</span>
          <span className="font-bold text-teal text-xl">৳{money(p.amount_paid)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <ReceiptExportButtons receipt={p} shareText={shareText} />
          {/* Lets the admin recheck this payment (amount, date, method, notes) before
              printing/sharing the receipt, without having to hunt for the Edit link
              elsewhere — and a clear Done to confirm it's correct and move on. */}
          <form action={deleteCollectionAction.bind(null, p.id)}>
            <button className="btn btn-danger-outline w-full confirm-delete">🗑 Delete Receipt</button>
          </form>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link href={`/collections/edit/${p.id}`} className="btn btn-outline w-full">✏️ Edit</Link>
            <Link href="/collections" prefetch={false} className="btn btn-primary w-full">✔ Done</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1.5">
      <span className="text-gray-500">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
