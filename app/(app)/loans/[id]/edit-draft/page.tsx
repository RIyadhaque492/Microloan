import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { updateDraftLoanAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';
import EditDraftForm from './EditDraftForm';

export const metadata = { title: 'Edit Draft Loan - MicroLoan Admin' };

export default async function EditDraftLoanPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();

  const [loan] = await sql`SELECT * FROM loans WHERE id = ${id} AND status = 'draft'`;
  if (!loan) notFound();

  const borrowers = await sql`SELECT id, full_name, borrower_code, phone FROM borrowers WHERE status = 'active' AND deleted_at IS NULL ORDER BY full_name`;
  const updateAction = updateDraftLoanAction.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Draft Loan" />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}
      <EditDraftForm loan={loan} borrowers={borrowers as any[]} updateAction={updateAction} />
    </div>
  );
}
