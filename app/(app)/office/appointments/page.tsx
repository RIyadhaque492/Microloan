import Link from 'next/link';
import { getAppointments } from '@/lib/office';
import { deleteAppointmentAction } from '@/lib/actions';
import { money, formatDMY, sortByDate } from '@/lib/utils';
import PageHeader from '../../PageHeader';
import OrderBar from '../../OrderBar';
import AppointmentPdfButtons from './AppointmentPdfButtons';

export const metadata = { title: 'Appointment Letters - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function AppointmentsPage({ searchParams }: { searchParams: { order?: string; error?: string } }) {
  const letters = sortByDate(await getAppointments(), searchParams.order, (l) => l.letter_date);
  return (
    <div className="flex flex-col h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <PageHeader title="Appointment Letters" showBack={false} action={<Link href="/office/appointments/new" className="btn btn-primary">➕ New Appointment Letter</Link>} />
      {searchParams.error && <div className="mb-2 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 flex-shrink-0">{searchParams.error}</div>}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-2 flex-shrink-0">
        <p className="text-sm text-gray-500">Fill in the details once — the letter is made for you as a PDF with your header and footer. Download it to keep as proof, or share it.</p>
        <OrderBar order={searchParams.order} />
      </div>

      <div className="table-wrap flex-1 min-h-0 !overflow-auto overscroll-contain [&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-10">
        <table className="app-table">
          <thead>
            <tr><th>Letter Date</th><th>Employee</th><th>Designation</th><th>Contact</th><th>Effective From</th><th className="text-right">Salary</th><th></th></tr>
          </thead>
          <tbody>
            {letters.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-10">No appointment letters yet — click “New Appointment Letter”.</td></tr>}
            {letters.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{l.letter_date ? formatDMY(l.letter_date) : '—'}</td>
                <td className="font-semibold">{l.employee_name}</td>
                <td>{l.designation}</td>
                <td>{l.contact || '—'}</td>
                <td className="whitespace-nowrap">{l.effective_date ? formatDMY(l.effective_date) : '—'}</td>
                <td className="text-right font-semibold">{l.salary ? `৳${money(l.salary)}` : '—'}</td>
                <td className="whitespace-nowrap text-right">
                  <span className="inline-flex items-start gap-2">
                    <AppointmentPdfButtons letter={l} />
                    <Link href={`/office/appointments/${l.id}/edit`} className="text-xs text-gray-500 hover:text-teal self-center">Edit</Link>
                    <form action={deleteAppointmentAction.bind(null, l.id)} className="inline self-center">
                      <button className="text-xs text-red-500 hover:text-red-700 confirm-delete">🗑 Delete</button>
                    </form>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
