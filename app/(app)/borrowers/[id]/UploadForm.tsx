'use client';

import { useFormStatus } from 'react-dom';

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
      {pending ? 'Uploading…' : '⬆️ Upload'}
    </button>
  );
}

export default function UploadForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">Document Title *</label>
        <input name="doc_title" required placeholder="e.g. NID Front Side" className="input" />
      </div>
      <div>
        <label className="label">Document Type</label>
        <select name="doc_type" className="input" defaultValue="borrower_nid">
          <optgroup label="Member">
            <option value="borrower_nid">Member NID / ID Card</option>
            <option value="borrower_photo">Member Photo</option>
            <option value="income_proof">Income Proof</option>
            <option value="address_proof">Address Proof</option>
          </optgroup>
          <optgroup label="Guarantor">
            <option value="guarantor_nid">Guarantor NID / ID Card</option>
            <option value="guarantor_photo">Guarantor Photo</option>
          </optgroup>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="label">File *</label>
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="input" />
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF. Max 3MB.</p>
      </div>
      <UploadButton />
    </form>
  );
}
