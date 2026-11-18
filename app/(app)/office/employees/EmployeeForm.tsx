import Link from 'next/link';
import DateInput from '@/app/(app)/DateInput';
import { DESIGNATION_SUGGESTIONS } from '@/lib/officeDefaults';
import type { Employee } from '@/lib/employees';

function Section({ title }: { title: string }) {
  return <div className="md:col-span-2 text-xs uppercase font-semibold text-gray-400 border-b border-gray-100 pb-1 pt-2">{title}</div>;
}

/** All details of one employee. Only the name is required. */
export default function EmployeeForm({
  action, initial, error, submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: Partial<Employee>;
  error?: string;
  submitLabel: string;
}) {
  const v = (k: keyof Employee) => (initial[k] == null ? '' : String(initial[k]));
  const text = (name: keyof Employee, label: string, ph = '', extra = '') => (
    <div className={extra}><label className="label">{label}</label><input name={name} defaultValue={v(name)} className="input" placeholder={ph} /></div>
  );
  return (
    <form action={action} className="card p-6 max-w-4xl">
      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Job Information" />
        <div><label className="label">Employee Name *</label><input name="full_name" required defaultValue={v('full_name')} className="input" placeholder="Full name" /></div>
        {text('employee_code', 'Employee ID / Code', 'e.g. EMP-001')}
        <div>
          <label className="label">Designation</label>
          <input name="designation" list="emp-designation-list" defaultValue={v('designation')} className="input" placeholder="e.g. Field Officer" />
          <datalist id="emp-designation-list">{DESIGNATION_SUGGESTIONS.map((d) => <option key={d} value={d} />)}</datalist>
        </div>
        <div><label className="label">Joining Date</label><DateInput name="joining_date" defaultValue={v('joining_date')} className="input" /></div>
        <div><label className="label">Monthly Salary (BDT)</label><input name="salary" type="number" step="0.01" min="0" defaultValue={initial.salary ? String(initial.salary) : ''} className="input font-semibold" /></div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={v('status') || 'Active'} className="input">
            <option>Active</option><option>On Leave</option><option>Resigned</option><option>Terminated</option>
          </select>
        </div>
        {text('bank_account', 'Bank / Mobile Banking Account', 'for salary payment', 'md:col-span-2')}

        <Section title="Personal Information" />
        {text('phone', 'Phone Number', '01XXXXXXXXX')}
        {text('email', 'Email', 'name@example.com')}
        {text('nid_no', 'NID / Birth Certificate No.')}
        <div><label className="label">Date of Birth</label><DateInput name="date_of_birth" defaultValue={v('date_of_birth')} className="input" /></div>
        <div>
          <label className="label">Gender</label>
          <select name="gender" defaultValue={v('gender')} className="input"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select>
        </div>
        <div>
          <label className="label">Marital Status</label>
          <select name="marital_status" defaultValue={v('marital_status')} className="input"><option value="">—</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option></select>
        </div>
        {text('father_name', "Father's Name")}
        {text('mother_name', "Mother's Name")}
        {text('spouse_name', 'Spouse Name')}
        {text('religion', 'Religion')}
        {text('nationality', 'Nationality', 'e.g. Bangladeshi')}
        <div>
          <label className="label">Blood Group</label>
          <select name="blood_group" defaultValue={v('blood_group')} className="input">
            <option value="">—</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        {text('qualification', 'Educational Qualification', 'e.g. HSC, Honours', 'md:col-span-2')}

        <Section title="Address" />
        {text('present_address', 'Present Address', '', 'md:col-span-2')}
        {text('permanent_address', 'Permanent Address', '', 'md:col-span-2')}

        <Section title="Emergency Contact" />
        {text('emergency_name', 'Contact Person')}
        {text('emergency_phone', 'Contact Phone')}
        {text('emergency_relation', 'Relation')}

        <div className="md:col-span-2">
          <label className="label">Other Information</label>
          <textarea name="other_info" rows={3} defaultValue={v('other_info')} className="input" placeholder="Experience, skills, notes…" />
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <button className="btn btn-primary">{submitLabel}</button>
        <Link href="/office/employees" className="btn btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
