import { notFound } from 'next/navigation';
import { getLoanForCollection } from '@/lib/data';
import { money } from '@/lib/utils';
import PageHeader from '../../PageHeader';
import CollectForm from './CollectForm';

export const metadata = { title: 'Collect Payment - MicroLoan Admin' };

export default async function CollectPage({
  params,
  searchParams,
}: {
  params: { loanId: string };
  searchParams: { installment_id?: string; error?: string };
}) {
  const loanId = Number(params.loanId);
  if (!loanId || isNaN(loanId)) notFound();
  const data = await getLoanForCollection(loanId);
  if (!data) notFound();
  const { loan, installments, lastPayment, totalPaid } = data;

  const installmentsArr = installments as any[];
  const preselectId = Number(searchParams.installment_id) || installmentsArr[0]?.id || 0;
  const remaining = Number(loan.total_payable) - totalPaid;

  return (
    <div>
      <PageHeader title="Collect Payment" />

      <div className="rounded-2xl overflow-hidden shadow-lg mb-5 max-w-4xl">
        <div className="bg-gradient-to-r from-navy via-navy to-teal-700 text-white px-6 py-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xl font-bold flex-shrink-0 border border-white/20">
              {loan.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-[180px]">
              <h2 className="font-bold text-lg leading-tight">{loan.full_name}</h2>
              <p className="text-teal-100 text-sm opacity-90">{loan.phone} · Member ID: {loan.borrower_code}</p>
              <p className="text-teal-100 text-xs opacity-75 mt-0.5">Loan Code: {loan.loan_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/15">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-teal-100 opacity-80">Last Payment</div>
              <div className="font-bold">{lastPayment ? `৳${money(lastPayment.amount_paid)}` : '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-teal-100 opacity-80">Payment Date</div>
              <div className="font-bold">{lastPayment ? new Date(lastPayment.payment_date).toLocaleDateString() : '—'}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-teal-100 opacity-80">Total Paid</div>
              <div className="font-bold">৳{money(totalPaid)}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-teal-100 opacity-80">Remaining Balance</div>
              <div className="font-bold">৳{money(remaining)}</div>
            </div>
          </div>
        </div>
      </div>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 max-w-4xl">{searchParams.error}</div>}

      <div className="max-w-4xl">
        {installmentsArr.length === 0 ? (
          <div className="card p-5 text-gray-400 text-sm">This loan has no outstanding installments.</div>
        ) : (
          <CollectForm loanId={loanId} installments={installmentsArr as any} preselectId={preselectId} />
        )}
      </div>
    </div>
  );
}
