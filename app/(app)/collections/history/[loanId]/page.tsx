import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLoan } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Transaction History - MicroLoan Admin' };

export default async function LoanTransactionHistoryPage({ params }: { params: { loanId: string } }) {
  const id = Number(params.loanId);
  if (!id || isNaN(id)) notFound();
  const data = await getLoan(id);
  if (!data) notFound();
  const { loan, installments, payments } = data;

  const paidTotal = (installments as any[]).reduce((s, i) => s + Number(i.paid_amount), 0);
  const remaining = Number(loan.total_payable) - paidTotal;

  return (
    <div>
      <PageHeader title="Transaction History" action={<Link href="/collections" className="btn btn-primary">✔ Done</Link>} />

      <div className="card p-5 mb-4">
        <h2 className="font-bold text-navy">{loan.full_name} ({loan.borrower_code})</h2>
        <p className="text-sm text-gray-500 mb-3">Loan Code: {loan.loan_code}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="text-xs text-green-700">Total Paid</div>
            <div className="text-lg font-bold text-green-800">৳{money(paidTotal)}</div>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <div className="text-xs text-red-700">Remaining Balance</div>
            <div className="text-lg font-bold text-red-800">৳{money(remaining)}</div>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">All Transactions</div>
        <table className="app-table">
          <thead><tr><th>Receipt No.</th><th>Date</th><th>Amount</th><th></th></tr></thead>
          <tbody>
            {(payments as any[]).length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-8">No payments recorded.</td></tr>}
            {(payments as any[]).map((p) => (
              <tr key={p.id}>
                <td><Link href={`/collections/receipt/${p.id}`} className="text-teal">{p.receipt_no}</Link></td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                <td>৳{money(p.amount_paid)}</td>
                <td><Link href={`/collections/edit/${p.id}`} className="text-xs text-gray-400 hover:text-teal">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
