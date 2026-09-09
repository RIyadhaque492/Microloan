import { notFound } from 'next/navigation';
import { getBorrower } from '@/lib/data';
import { updateBorrowerAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';

export default async function EditBorrowerPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const id = Number(params.id);
  const borrower = await getBorrower(id);
  if (!borrower) notFound();

  const action = updateBorrowerAction.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Borrower" />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <form action={action} className="card p-6 max-w-3xl space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">Full Name *</label><input name="full_name" defaultValue={borrower.full_name} required className="input" /></div>
          <div><label className="label">Father's Name</label><input name="father_name" defaultValue={borrower.father_name} className="input" /></div>
          <div>
            <label className="label">Gender</label>
            <select name="gender" defaultValue={borrower.gender || 'male'} className="input">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">Phone *</label><input name="phone" defaultValue={borrower.phone} required className="input" /></div>
          <div><label className="label">Email</label><input name="email" type="email" defaultValue={borrower.email} className="input" /></div>
          <div><label className="label">NID Number</label><input name="nid_number" defaultValue={borrower.nid_number} className="input" /></div>
          <div className="md:col-span-2"><label className="label">Present Address</label><textarea name="present_address" defaultValue={borrower.present_address} className="input" rows={2} /></div>
          <div><label className="label">Occupation</label><input name="occupation" defaultValue={borrower.occupation} className="input" /></div>
          <div><label className="label">Monthly Income</label><input name="monthly_income" type="number" step="0.01" defaultValue={borrower.monthly_income} className="input" /></div>
          <div><label className="label">Guarantor Name</label><input name="guarantor_name" defaultValue={borrower.guarantor_name} className="input" /></div>
          <div><label className="label">Guarantor Phone</label><input name="guarantor_phone" defaultValue={borrower.guarantor_phone} className="input" /></div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={borrower.status} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
