import { notFound } from 'next/navigation';
import { getLoanForCollection, getCollectionNotesSuggestions } from '@/lib/data';
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
  const { loan, installments, lastPayment, totalPaid, lastInput } = data;
  const notesSuggestions = await getCollectionNotesSuggestions();

  const installmentsArr = installments as any[];
  const preselectId = Number(searchParams.installment_id) || installmentsArr[0]?.id || 0;
  const remaining = Number(loan.total_payable) - totalPaid;

  return (
    <div>
      <PageHeader title="Collect Payment" />

      <div className="rounded-xl overflow-hidden shadow mb-3 max-w-4xl">
        <div className="bg-gradient-to-r from-navy via-navy to-teal-700 text-white px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-base font-bold flex-shrink-0 border border-white/20">
              {loan.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold leading-tight truncate">{loan.full_name}</h2>
              <p className="text-teal-100 text-xs opacity-90 truncate">{loan.phone} · {loan.borrower_code} · {loan.loan_code}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-white/15 text-xs">
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Principal</div><div className="font-bold">৳{money(loan.loan_amount)}</div></div>
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Total Payable</div><div className="font-bold">৳{money(loan.total_payable)}</div></div>
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Total Paid</div><div className="font-bold">৳{money(totalPaid)}</div></div>
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Remaining</div><div className="font-bold">৳{money(remaining)}</div></div>
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Last Payment</div><div className="font-bold">{lastPayment ? `৳${money(lastPayment.amount_paid)}` : '—'}</div></div>
            <div><div className="uppercase text-[10px] text-teal-100 opacity-80">Last Date · Method</div><div className="font-bold">{lastPayment ? `${new Date(lastPayment.payment_date).toLocaleDateString()} · ${String(lastPayment.payment_method || '').replace('_', ' ')}` : '—'}</div></div>
          </div>
        </div>
      </div>

      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 max-w-4xl">{searchParams.error}</div>}

      <div className="max-w-4xl">
        {installmentsArr.length === 0 ? (
          <div className="card p-5 text-gray-400 text-sm">This loan has no outstanding installments.</div>
        ) : (
          <CollectForm
            loanId={loanId}
            installments={installmentsArr as any}
            preselectId={preselectId}
            lastInput={lastInput}
            installmentAmount={Number(loan.installment_amount)}
            notesSuggestions={notesSuggestions}
          />
        )}
      </div>
    </div>
  );
}
