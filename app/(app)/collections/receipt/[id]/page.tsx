import { notFound } from 'next/navigation';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { money } from '@/lib/utils';
import ShareButtons from '../../../reports/ShareButtons';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Payment Receipt - MicroLoan Admin' };

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
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
    `Borrower: ${p.full_name} (${p.borrower_code})`,
    `Loan Code: ${p.loan_code}`,
    `Amount Paid: ৳${money(p.amount_paid)}`,
    `Method: ${p.payment_method}`,
  ].join('\n');

  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="Payment Receipt" />
      <div className="card p-6 text-center">
        <div className="text-3xl mb-1">💰</div>
        <h2 className="font-bold text-navy">MicroLoan Admin</h2>
        <p className="text-gray-400 text-sm mb-4">Payment Receipt</p>

        <div className="text-left text-sm space-y-2">
          <Row label="Receipt No." value={p.receipt_no} />
          <Row label="Date" value={new Date(p.payment_date).toLocaleDateString()} />
          <Row label="Borrower" value={`${p.full_name} (${p.borrower_code})`} />
          <Row label="Loan Code" value={p.loan_code} />
          <Row label="Method" value={p.payment_method} />
          {p.notes && <Row label="Notes" value={p.notes} />}
        </div>

        <div className="flex justify-between items-center bg-gray-50 rounded-lg p-3 my-4">
          <span className="font-semibold">Amount Paid</span>
          <span className="font-bold text-teal text-xl">৳{money(p.amount_paid)}</span>
        </div>

        <div className="flex flex-col gap-2">
          <ShareButtons text={shareText} title="Payment Receipt" />
          <Link href={`/loans/${p.loan_id}`} className="btn btn-outline w-full mt-2">Back to Loan</Link>
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
