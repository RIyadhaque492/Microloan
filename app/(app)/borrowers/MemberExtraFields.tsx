'use client';

import { useRef } from 'react';

type B = Record<string, any> | undefined;
const v = (b: B, k: string, d = '') => (b && b[k] != null ? String(b[k]) : d);

/** Marital status, religion, nationality, qualification. */
export function PersonalExtraFields({ b }: { b?: B }) {
  return (
    <>
      <datalist id="religion-suggestions">{['Islam', 'Hinduism', 'Buddhism', 'Christianity', 'Other'].map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="qualification-suggestions">{['No formal education', 'Primary', 'Class 8 / JSC', 'SSC', 'HSC', 'Diploma', 'Bachelor', 'Masters'].map((x) => <option key={x} value={x} />)}</datalist>
      <div>
        <label className="label">Marital Status</label>
        <select name="marital_status" defaultValue={v(b, 'marital_status')} className="input">
          <option value="">— Select —</option>
          {['Single', 'Married', 'Widowed', 'Divorced', 'Separated'].map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <div><label className="label">Religion</label><input name="religion" list="religion-suggestions" defaultValue={v(b, 'religion')} className="input" /></div>
      <div><label className="label">Nationality</label><input name="nationality" defaultValue={v(b, 'nationality', 'Bangladeshi')} className="input" /></div>
      <div><label className="label">Qualification</label><input name="qualification" list="qualification-suggestions" defaultValue={v(b, 'qualification')} className="input" placeholder="e.g. SSC, HSC, Bachelor" /></div>
    </>
  );
}

/** Permanent address with a one-click "same as present address". */
export function PermanentAddressField({ b }: { b?: B }) {
  const ref = useRef<HTMLInputElement>(null);
  function copy(checked: boolean) {
    const present = document.querySelector<HTMLInputElement | HTMLTextAreaElement>('[name="present_address"]');
    if (ref.current) ref.current.value = checked ? present?.value || '' : '';
  }
  return (
    <div className="md:col-span-2">
      <label className="label">Permanent Address</label>
      <input ref={ref} type="text" name="permanent_address" defaultValue={v(b, 'permanent_address')} className="input" />
      <label className="mt-1 inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
        <input type="checkbox" onChange={(e) => copy(e.target.checked)} /> Same as present address
      </label>
    </div>
  );
}

/** Guarantor NID, occupation and address. */
export function GuarantorExtraFields({ b }: { b?: B }) {
  return (
    <>
      <div><label className="label">Guarantor NID Number</label><input name="guarantor_nid" defaultValue={v(b, 'guarantor_nid')} className="input" /></div>
      <div><label className="label">Guarantor Occupation</label><input name="guarantor_occupation" list="occupation-suggestions" defaultValue={v(b, 'guarantor_occupation')} className="input" /></div>
      <div className="md:col-span-2"><label className="label">Guarantor Address</label><input name="guarantor_address" defaultValue={v(b, 'guarantor_address')} className="input" /></div>
    </>
  );
}

export function OtherInfoField({ b }: { b?: B }) {
  return (
    <div className="md:col-span-2">
      <label className="label">Other Information</label>
      <textarea name="other_info" rows={3} defaultValue={v(b, 'other_info')} className="input" placeholder="Anything else worth recording about this member" />
    </div>
  );
}
