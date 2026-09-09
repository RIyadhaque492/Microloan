import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLoan, refreshOverdueInstallments } from '@/lib/data';
import { money, statusBadgeClass } from '@/lib/utils';
import { updateLoanStatusAction } from '@/lib/actions';
import BackLink from '../../BackLink';

export default async function LoanViewPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  await refreshOverdueInstallments();
  const data = await getLoan(id);
  if (!data) notFound();
  const { loan, installments, payments } = data;

  const paidTotal = (installments as any[]).reduce((s, i) => s + Number(i.paid_amount), 0);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div className="flex items-start gap-2">
          <BackLink />
          <div>
            <h1 className="text-lg font-bold text-navy flex items-center gap-2">
              {loan.loan_code} <span className={`badge ${statusBadgeClass(loan.status)}`}>{loan.status}</span>
            </h1>
            <p className="text-gray-500 text-sm">
              Borrower: <Link href={`/borrowers/${loan.borrower_id}`} className="text-teal">{loan.full_name}</Link> ({loan.borrower_code}) — {loan.phone}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {loan.status === 'pending' && (
            <>
              <form action={updateLoanStatusAction.bind(null, id, 'approve')}><button className="btn btn-primary !bg-green-600">✅ Approve</button></form>
              <form action={updateLoanStatusAction.bind(null, id, 'reject')}><button className="btn btn-danger-outline">❌ Reject</button></form>
            </>
          )}
          {loan.status === 'approved' && (
            <form action={updateLoanStatusAction.bind(null, id, 'activate')}><button className="btn btn-primary">▶ Mark Active / Disburse</button></form>
          )}
          <Link href={`/collections/${id}`} className="btn btn-outline">💵 Collect Payment</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(loan.loan_amount)}</div><div className="text-xs text-gray-500">Principal</div></div>
        <div className="card p-4"><div className="text-lg font-bold text-navy">{loan.interest_rate}%</div><div className="text-xs text-gray-500">{loan.interest_type} Interest</div></div>
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(loan.total_payable)}</div><div className="text-xs text-gray-500">Total Payable</div></div>
        <div className="card p-4"><div className="text-lg font-bold text-navy">৳{money(Number(loan.total_payable) - paidTotal)}</div><div className="text-xs text-gray-500">Balance Remaining</div></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="table-wrap">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Installment Schedule</div>
          <table className="app-table">
            <thead><tr><th>#</th><th>Due</th><th>Amount</th><th>Paid</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(installments as any[]).map((i) => (
                <tr key={i.id}>
                  <td>{i.installment_no}</td>
                  <td>{new Date(i.due_date).toLocaleDateString()}</td>
                  <td>৳{money(i.amount)}</td>
                  <td>৳{money(i.paid_amount)}</td>
                  <td><span className={`badge ${statusBadgeClass(i.status)}`}>{i.status}</span></td>
                  <td>{i.status !== 'paid' && <Link href={`/collections/${id}?installment_id=${i.id}`} className="btn btn-outline !py-1 !px-2 text-xs">Collect</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-wrap h-fit">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Payment History</div>
          <table className="app-table">
            <thead><tr><th>Receipt</th><th>Date</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {(payments as any[]).length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-6">No payments recorded.</td></tr>}
              {(payments as any[]).map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/collections/receipt/${p.id}`} className="text-teal">{p.receipt_no}</Link></td>
                  <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td>৳{money(p.amount_paid)}</td>
                  <td><Link href={`/collections/edit/${p.id}`} className="btn btn-outline !py-1 !px-2 text-xs">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
