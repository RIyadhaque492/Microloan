import Link from 'next/link';
import DateInput from '@/app/(app)/DateInput';
import { DEFAULT_RESPONSIBILITIES, DEFAULT_RULES, DEFAULT_SIGNATORY_TITLE, DESIGNATION_SUGGESTIONS } from '@/lib/officeDefaults';
import type { AppointmentLetter } from '@/lib/office';

/** Appointment letter details. Everything except name and designation is optional — blank dates print as blank lines to fill in by hand. */
export default function AppointmentForm({
  action, initial, error, submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: Partial<AppointmentLetter> & { organization: string };
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="card p-6 max-w-3xl space-y-4">
      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="label">Employee Name *</label><input name="employee_name" required defaultValue={initial.employee_name || ''} className="input" placeholder="e.g. Mohammed Saimon" /></div>
        <div>
          <label className="label">Designation *</label>
          <input name="designation" list="designation-list" required defaultValue={initial.designation || ''} className="input" placeholder="e.g. Field Officer" />
          <datalist id="designation-list">{DESIGNATION_SUGGESTIONS.map((d) => <option key={d} value={d} />)}</datalist>
        </div>
        <div><label className="label">Contact Number</label><input name="contact" defaultValue={initial.contact || ''} className="input" placeholder="01XXXXXXXXX" /></div>
        <div className="md:col-span-2"><label className="label">Employee Address</label><input name="address" defaultValue={initial.address || ''} className="input" placeholder="Village / Road, Upazila, District" maxLength={300} /></div>
        <div>
          <label className="label">Monthly Salary (BDT)</label>
          <input name="salary" type="number" step="0.01" min="0" defaultValue={initial.salary ? String(initial.salary) : ''} className="input font-semibold" placeholder="10000" />
          <p className="text-xs text-gray-400 mt-1">The amount in words is written automatically.</p>
        </div>
        <div>
          <label className="label">Letter Date</label>
          <DateInput name="letter_date" defaultValue={initial.letter_date || ''} className="input" />
          <p className="text-xs text-gray-400 mt-1">Leave empty to fill in by hand.</p>
        </div>
        <div>
          <label className="label">Effective From</label>
          <DateInput name="effective_date" defaultValue={initial.effective_date || ''} className="input" />
          <p className="text-xs text-gray-400 mt-1">Leave empty to fill in by hand.</p>
        </div>
      </div>

      <div>
        <label className="label">Organization Name (used in the letter)</label>
        <input name="organization" defaultValue={initial.organization} className="input" placeholder="e.g. Swapnojoyee Sromozibi Somobay Somiti Ltd." />
        <p className="text-xs text-gray-400 mt-1">The logo, address and contact in the letter header and footer come from Website Settings → Document Branding.</p>
      </div>

      <div>
        <label className="label">Job Responsibilities</label>
        <textarea name="responsibilities" rows={4} defaultValue={initial.responsibilities || DEFAULT_RESPONSIBILITIES} className="input" />
      </div>
      <div>
        <label className="label">Rules and Regulations</label>
        <textarea name="rules" rows={3} defaultValue={initial.rules || DEFAULT_RULES} className="input" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="label">Signatory Name</label><input name="signatory_name" defaultValue={initial.signatory_name || ''} className="input" placeholder="e.g. MD. MAMUN" /></div>
        <div><label className="label">Signatory Title</label><input name="signatory_title" defaultValue={initial.signatory_title || DEFAULT_SIGNATORY_TITLE} className="input" /></div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-primary">{submitLabel}</button>
        <Link href="/office/appointments" className="btn btn-outline">Cancel</Link>
      </div>
    </form>
  );
}
