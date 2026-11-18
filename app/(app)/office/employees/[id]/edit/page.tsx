import { notFound } from 'next/navigation';
import { saveEmployeeAction } from '@/lib/actions';
import { getEmployee } from '@/lib/employees';
import PageHeader from '../../../../PageHeader';
import EmployeeForm from '../../EmployeeForm';

export const metadata = { title: 'Edit Employee - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EditEmployeePage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  const emp = await getEmployee(id);
  if (!emp) return notFound();
  return (
    <div>
      <PageHeader title="Edit Employee" />
      <EmployeeForm action={saveEmployeeAction.bind(null, id)} initial={emp} error={searchParams.error} submitLabel="💾 Save Changes" />
    </div>
  );
}
