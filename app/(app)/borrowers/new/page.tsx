import { getNextMemberId, getPresentAddressSuggestions, getMonthlyIncomeSuggestions } from '@/lib/data';
import { createBorrowerAction } from '@/lib/actions';
import PageHeader from '../../PageHeader';

export const metadata = { title: 'Add Member - MicroLoan Admin' };
export const dynamic = 'force-dynamic';

export default async function NewBorrowerPage({ searchParams }: { searchParams: { error?: string } }) {
  const suggestedId = await getNextMemberId();
  const [addressSuggestions, incomeSuggestions] = await Promise.all([
    getPresentAddressSuggestions(),
    getMonthlyIncomeSuggestions(),
  ]);

  return (
    <div>
      <PageHeader title="Add Member" />
      {searchParams.error && <div className="mb-4 rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{searchParams.error}</div>}

      <form action={createBorrowerAction} className="card p-6 max-w-3xl space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Member ID *</label>
            <input name="member_id" required defaultValue={suggestedId} className="input" />
            <p className="text-xs text-gray-400 mt-1">Auto-suggested next ID — edit if you want a different one.</p>
          </div>
          <div><label className="label">Full Name *</label><input name="full_name" required className="input" /></div>
          <div><label className="label">Father's Name</label><input name="father_name" className="input" /></div>
          <div>
            <label className="label">Gender</label>
            <select name="gender" className="input">
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div><label className="label">Phone *</label><input name="phone" required className="input" /></div>
          <div><label className="label">Email</label><input name="email" type="email" className="input" /></div>
          <div><label className="label">NID Number</label><input name="nid_number" className="input" /></div>
          <div className="md:col-span-2">
            <label className="label">Present Address</label>
            {/* A <datalist> for autosuggest only works on <input>, not <textarea>, so this
                is a single-line text input rather than the old multi-line textarea. */}
            <input type="text" name="present_address" list="present-address-suggestions" className="input" />
            <datalist id="present-address-suggestions">
              {addressSuggestions.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div><label className="label">Occupation</label><input name="occupation" className="input" /></div>
          <div>
            <label className="label">Monthly Income</label>
            <input name="monthly_income" type="number" step="0.01" list="monthly-income-suggestions" className="input" />
            <datalist id="monthly-income-suggestions">
              {incomeSuggestions.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div><label className="label">Guarantor Name</label><input name="guarantor_name" className="input" /></div>
          <div><label className="label">Guarantor Phone</label><input name="guarantor_phone" className="input" /></div>
          <div>
            <label className="label">Registration Fee (৳)</label>
            <input name="registration_fee" type="number" step="0.01" defaultValue={0} className="input" />
            <p className="text-xs text-gray-400 mt-1">One-time membership fee collected at sign-up, if any.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">Save Member</button>
        </div>
      </form>
    </div>
  );
}
