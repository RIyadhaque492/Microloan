import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { updateLoanAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';
import EditDraftForm from '../edit-draft/EditDraftForm';

export const metadata = { title: 'Edit Loan - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EditLoanPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();

  const [loan] = await sql`SELECT * FROM loans WHERE id = ${id}`;
  if (!loan) notFound();

  const borrowers = await sql`SELECT id, full_name, borrower_code, phone FROM borrowers WHERE deleted_at IS NULL ORDER BY full_name`;
  const action = updateLoanAction.bind(null, id);

  return (
    <div>
      <PageHeader title={`Edit Loan ${loan.loan_code}`} />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4 max-w-3xl">
        Saving rebuilds the installment schedule. Payments already collected are kept and re-applied oldest-first.
      </p>
      <EditDraftForm loan={loan} borrowers={borrowers as any[]} updateAction={action} submitLabel="💾 Save Loan Changes" />
    </div>
  );
}
