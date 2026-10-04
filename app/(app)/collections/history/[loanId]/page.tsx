import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLoan } from '@/lib/data';
import { deleteCollectionAction } from '@/lib/actions';
import { money } from '@/lib/utils';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Transaction History - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function LoanTransactionHistoryPage({ params }: { params: { loanId: string } }) {
  const id = Number(params.loanId);
  if (!id || isNaN(id)) notFound();
  const data = await getLoan(id);
  if (!data) notFound();
  const { loan, installments, payments } = data;

  const paidTotal = (installments as any[]).reduce((s, i) => s + Number(i.paid_amount), 0);
  const remaining = Math.max(0, Number(loan.total_payable) - paidTotal);

  // Receipts in order (R0001, R0002, ...) — oldest receipt first.
  const ordered = [...(payments as any[])].sort((a, b) => Number(a.id) - Number(b.id));

  return (
    // One-screen layout: the page never scrolls; only the table body scrolls if it has many rows.
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)] overflow-hidden">
      <PageHeader title="Transaction History" action={<Link href="/collections" prefetch={false} className="btn btn-primary">✔ Done</Link>} />

      <div className="mb-2 text-sm text-gray-600 flex-shrink-0">
        <span className="font-bold text-navy">{loan.full_name}</span> ({loan.borrower_code}) · Loan {loan.loan_code}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3 flex-shrink-0">
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-2.5">
          <div className="text-[11px] text-purple-700">Disbursement Date</div>
          <div className="text-base font-bold text-purple-800">{loan.disbursement_date ? new Date(loan.disbursement_date).toLocaleDateString() : '—'}</div>
        </div>
        <div className="rounded-lg bg-sky-50 border border-sky-200 p-2.5">
          <div className="text-[11px] text-sky-700">Loan Amount</div>
          <div className="text-base font-bold text-sky-800">৳{money(loan.loan_amount)}</div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
          <div className="text-[11px] text-amber-700">Total Payable</div>
          <div className="text-base font-bold text-amber-800">৳{money(loan.total_payable)}</div>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-2.5">
          <div className="text-[11px] text-green-700">Paid</div>
          <div className="text-base font-bold text-green-800">৳{money(paidTotal)}</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 col-span-2 lg:col-span-1">
          <div className="text-[11px] text-red-700">Remaining Balance</div>
          <div className="text-base font-bold text-red-800">৳{money(remaining)}</div>
        </div>
      </div>

      <div className="table-wrap flex-1 min-h-0 flex flex-col !overflow-hidden border-2 !border-gray-700">
        <div className="px-4 py-2 border-b border-gray-100 font-semibold text-sm flex-shrink-0">All Transactions</div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="app-table border-collapse [&_td]:border [&_td]:border-gray-400 [&_th]:border [&_th]:border-gray-500">
            <thead className="sticky top-0">
              <tr>
                <th>SL</th><th>Receipt No.</th><th>Date</th><th>Particulars</th><th>Method</th>
                <th>Amount Paid</th><th>Total Paid</th><th>Remaining Balance</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ordered.length === 0 && <tr><td colSpan={9} className="text-center text-gray-400 py-8">No payments recorded.</td></tr>}
              {(() => {
                let cumulativePaid = 0;
                return ordered.map((p, i) => {
                  cumulativePaid += Number(p.amount_paid);
                  const rowRemaining = Math.max(0, Number(loan.total_payable) - cumulativePaid);
                  return (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td><Link href={`/collections/receipt/${p.id}`} className="text-teal font-semibold">{p.receipt_no}</Link></td>
                      <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                      <td>{p.notes || 'Installment'}</td>
                      <td className="capitalize">{String(p.payment_method || '').replace('_', ' ')}</td>
                      <td className="text-green-700 font-semibold">৳{money(p.amount_paid)}</td>
                      <td>৳{money(cumulativePaid)}</td>
                      <td className="font-semibold text-red-600">৳{money(rowRemaining)}</td>
                      <td className="whitespace-nowrap">
                        <Link href={`/collections/edit/${p.id}`} className="text-xs text-gray-500 hover:text-teal mr-2">Edit</Link>
                        <form action={deleteCollectionAction.bind(null, p.id)} className="inline">
                          <button className="text-xs text-red-500 hover:text-red-700 confirm-delete">🗑 Delete</button>
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
  );
}
