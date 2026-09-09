import { notFound } from 'next/navigation';
import { getLoanForCollection } from '@/lib/data';
import { money } from '@/lib/utils';
import CollectForm from './CollectForm';
import PageHeader from '../../PageHeader';

export default async function CollectPage({
  params,
  searchParams,
}: {
  params: { loanId: string };
  searchParams: { installment_id?: string; error?: string };
}) {
  const loanId = Number(params.loanId);
  const data = await getLoanForCollection(loanId);
  if (!data) notFound();
  const { loan, installments } = data;

  const installmentsArr = installments as any[];
  const balance = installmentsArr.reduce((s, i) => s + (Number(i.amount) - Number(i.paid_amount)), 0);
  const preselectId = Number(searchParams.installment_id) || installmentsArr[0]?.id || 0;

  return (
    <div>
      <PageHeader title="Collect Payment" />
      <div className="grid lg:grid-cols-2 gap-4 max-w-4xl">
      <div className="card p-5 h-fit">
        <h2 className="font-bold text-navy mb-1">{loan.full_name}</h2>
        <p className="text-sm text-gray-500 mb-1">{loan.phone}</p>
        <p className="text-xs text-gray-400 mb-3">Loan Code: {loan.loan_code}</p>
        {searchParams.error && (
          <div className="mb-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>
        )}
        <div className="flex justify-between border-t pt-2 text-sm">
          <span className="text-gray-500">Outstanding Balance</span>
          <strong>৳{money(balance)}</strong>
        </div>
      </div>

      {installmentsArr.length === 0 ? (
        <div className="card p-5 text-gray-400 text-sm">This loan has no outstanding installments.</div>
      ) : (
        <CollectForm loanId={loanId} installments={installmentsArr as any} preselectId={preselectId} />
      )}
      </div>
    </div>
  );
}
