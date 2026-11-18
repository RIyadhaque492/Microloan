import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmployee } from '@/lib/employees';
import { formatDMY, money } from '@/lib/utils';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Employee Details - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) notFound();
  const e = await getEmployee(id);
  if (!e) return notFound();
  const groups: { title: string; rows: [string, string][] }[] = [
    { title: 'Job Information', rows: [
      ['Employee ID', e.employee_code], ['Designation', e.designation], ['Joining Date', e.joining_date ? formatDMY(e.joining_date) : ''],
      ['Monthly Salary', e.salary ? `৳${money(e.salary)}` : ''], ['Status', e.status], ['Bank / Mobile Account', e.bank_account],
    ] },
    { title: 'Personal Information', rows: [
      ['Phone', e.phone], ['Email', e.email], ['NID / Birth Cert. No.', e.nid_no], ['Date of Birth', e.date_of_birth ? formatDMY(e.date_of_birth) : ''],
      ['Gender', e.gender], ['Marital Status', e.marital_status], ["Father's Name", e.father_name], ["Mother's Name", e.mother_name],
      ['Spouse Name', e.spouse_name], ['Religion', e.religion], ['Nationality', e.nationality], ['Blood Group', e.blood_group], ['Qualification', e.qualification],
    ] },
    { title: 'Address', rows: [['Present Address', e.present_address], ['Permanent Address', e.permanent_address]] },
    { title: 'Emergency Contact', rows: [['Contact Person', e.emergency_name], ['Contact Phone', e.emergency_phone], ['Relation', e.emergency_relation]] },
    { title: 'Other', rows: [['Other Information', e.other_info]] },
  ];
  return (
    <div>
      <PageHeader title={e.full_name} action={
        <span className="flex gap-2">
          <Link href={`/office/appointments/new?employee=${e.id}`} className="btn btn-outline">📄 Appointment Letter</Link>
          <Link href={`/office/employees/${e.id}/edit`} className="btn btn-primary">✏️ Edit</Link>
        </span>
      } />
      <div className="space-y-4 max-w-4xl">
        {groups.map((g) => (
          <div key={g.title} className="card p-5">
            <div className="text-xs uppercase font-semibold text-gray-400 mb-3">{g.title}</div>
            <dl className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {g.rows.map(([k, val]) => (
                <div key={k} className="flex gap-2"><dt className="text-gray-500 w-44 flex-shrink-0">{k}</dt><dd className="font-medium whitespace-pre-line">{val || '—'}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
