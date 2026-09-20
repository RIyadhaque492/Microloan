import { notFound } from 'next/navigation';
import { getBorrower } from '@/lib/data';
import { updateBorrowerAction } from '@/lib/actions';
import PageHeader from '../../../PageHeader';

export const metadata = { title: 'Edit Member - MicroLoan Admin' };

export default async function EditBorrowerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id || isNaN(id)) notFound();
  const borrower = await getBorrower(id);
  if (!borrower) notFound();

  const updateAction = updateBorrowerAction.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Member" />

      <form action={updateAction} className="card p-6 max-w-3xl space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="label">Full Name *</label><input name="full_name" required defaultValue={borrower.full_name} className="input" /></div>
          <div><label className="label">Father's Name</label><input name="father_name" defaultValue={borrower.father_name} className="input" /></div>
          <div>
            <label className="label">Gender</label>
            <select name="gender" defaultValue={borrower.gender} className="input">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">Phone *</label><input name="phone" required defaultValue={borrower.phone} className="input" /></div>
          <div><label className="label">Email</label><input name="email" type="email" defaultValue={borrower.email} className="input" /></div>
          <div><label className="label">NID Number</label><input name="nid_number" defaultValue={borrower.nid_number} className="input" /></div>
          <div className="md:col-span-2"><label className="label">Present Address</label><textarea name="present_address" defaultValue={borrower.present_address} className="input" rows={2} /></div>
          <div><label className="label">Occupation</label><input name="occupation" defaultValue={borrower.occupation} className="input" /></div>
          <div><label className="label">Monthly Income</label><input name="monthly_income" type="number" step="0.01" defaultValue={borrower.monthly_income} className="input" /></div>
          <div><label className="label">Guarantor Name</label><input name="guarantor_name" defaultValue={borrower.guarantor_name} className="input" /></div>
          <div><label className="label">Guarantor Phone</label><input name="guarantor_phone" defaultValue={borrower.guarantor_phone} className="input" /></div>
          <div>
            <label className="label">Registration Fee (৳)</label>
            <input name="registration_fee" type="number" step="0.01" defaultValue={borrower.registration_fee} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={borrower.status} className="input">
              <option value="active">Active</option><option value="inactive">Inactive</option><option value="blacklisted">Blacklisted</option>
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
