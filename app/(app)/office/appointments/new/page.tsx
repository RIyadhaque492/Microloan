import { saveAppointmentAction } from '@/lib/actions';
import { getSiteSettings } from '@/lib/data';
import { todayISO } from '@/lib/utils';
import PageHeader from '../../../PageHeader';
import AppointmentForm from '../AppointmentForm';

export const metadata = { title: 'New Appointment Letter - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

/** The organization's name = the first lines of the document header (up to the "Reg. No." line). */
function organizationFromHeader(header: any): string {
  const lines = String(header || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const keep: string[] = [];
  for (const l of lines) {
    if (/^(reg|contact|email|office|phone|tel)\b/i.test(l) || /:/.test(l)) break;
    keep.push(l);
  }
  return keep.join(' ');
}

export default async function NewAppointmentPage({ searchParams }: { searchParams: { error?: string } }) {
  const brand: any = await getSiteSettings();
  return (
    <div>
      <PageHeader title="New Appointment Letter" />
      <AppointmentForm
        action={saveAppointmentAction.bind(null, 0)}
        initial={{ letter_date: todayISO(), organization: organizationFromHeader(brand?.doc_header_text) }}
        error={searchParams.error}
        submitLabel="💾 Save & Generate"
      />
    </div>
  );
}
