import { notFound } from 'next/navigation';
import { saveAppointmentAction } from '@/lib/actions';
import { getAppointment } from '@/lib/office';
import PageHeader from '../../../../PageHeader';
import AppointmentForm from '../../AppointmentForm';

export const metadata = { title: 'Edit Appointment Letter - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EditAppointmentPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  const letter = await getAppointment(id);
  if (!letter) return notFound();
  return (
    <div>
      <PageHeader title="Edit Appointment Letter" />
      <AppointmentForm action={saveAppointmentAction.bind(null, id)} initial={letter} error={searchParams.error} submitLabel="💾 Save Changes" />
    </div>
  );
}
