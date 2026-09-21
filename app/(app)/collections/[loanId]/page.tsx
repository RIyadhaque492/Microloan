import { notFound } from 'next/navigation';
import { getLoanForCollection } from '@/lib/data';
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
  const { loan, installments } = data;

  const installmentsArr = installments as any[];
  const preselectId = Number(searchParams.installment_id) || installmentsArr[0]?.id || 0;

  return (
    <div>
      <PageHeader title="Collect Payment" />
      <div className="grid lg:grid-cols-2 gap-4 max-w-4xl">
        <div className="card p-5 h-fit">
          <h2 className="font-bold text-navy mb-1">{loan.full_name}</h2>
          <p className="text-sm text-gray-500 mb-1">{loan.phone}</p>
          <p className="text-xs text-gray-400">Loan Code: {loan.loan_code}</p>
          {searchParams.error && <div className="mt-3 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}
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
