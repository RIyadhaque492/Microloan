import { saveEmployeeAction } from '@/lib/actions';
import { todayISO } from '@/lib/utils';
import PageHeader from '../../../PageHeader';
import EmployeeForm from '../EmployeeForm';

export const metadata = { title: 'New Employee - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default function NewEmployeePage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div>
      <PageHeader title="New Employee" />
      <EmployeeForm action={saveEmployeeAction.bind(null, 0)} initial={{ joining_date: todayISO(), nationality: 'Bangladeshi', status: 'Active' }} error={searchParams.error} submitLabel="💾 Save Employee" />
    </div>
  );
}
