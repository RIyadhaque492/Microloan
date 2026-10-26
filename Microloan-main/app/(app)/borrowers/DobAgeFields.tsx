'use client';

import { useState } from 'react';
import DateInput from '@/app/(app)/DateInput';
import { calcAge } from '@/lib/utils';

/** Date of birth + Age. Age is worked out from the date of birth automatically (and kept up to date
 *  by the server on save), so it is shown read-only. Members saved before this existed keep their old
 *  typed age until a date of birth is entered. */
export default function DobAgeFields({ defaultDob = '', legacyAge }: { defaultDob?: string; legacyAge?: number | null }) {
  const [dob, setDob] = useState(defaultDob);
  const auto = calcAge(dob);
  const age = auto ?? (dob ? null : legacyAge ?? null);

  return (
    <>
      <div>
        <label className="label">Date of Birth</label>
        <DateInput name="date_of_birth" value={dob} onChange={(v: string) => setDob(v)} className="input" />
      </div>
      <div>
        <label className="label">Age (automatic)</label>
        <input type="text" readOnly tabIndex={-1} value={age ?? ''} placeholder="Filled from date of birth" className="input bg-gray-50 text-gray-700" />
        <input type="hidden" name="age" value={age ?? ''} />
      </div>
    </>
  );
}
