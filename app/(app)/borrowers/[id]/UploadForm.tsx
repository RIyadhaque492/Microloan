'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

const MAX_BYTES = 3 * 1024 * 1024;

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">
      {pending ? 'Uploading…' : '⬆️ Upload'}
    </button>
  );
}

/** Shrinks big phone photos in the browser (max 1600px, JPEG) so they fit the upload limit. */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const q of [0.82, 0.7, 0.55]) {
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
      if (blob && blob.size <= MAX_BYTES * 0.9) {
        return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      }
    }
    return file;
  } catch {
    return file; // e.g. HEIC the browser can't decode — send as-is
  }
}

export default function UploadForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setError('');
    let file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      setError('Please choose a file first.');
      return;
    }
    if (file.type.startsWith('image/') && file.type !== 'image/heic' && file.type !== 'image/heif' && file.size > 800 * 1024) {
      file = await compressImage(file);
      formData.set('file', file);
    }
    if (file.size > MAX_BYTES) {
      setError('File is still over 3MB. Use a smaller photo or a compressed PDF.');
      return;
    }
    try {
      await action(formData);
    } catch (e: any) {
      // Next.js signals redirects by throwing — let those through.
      if (e?.digest?.startsWith?.('NEXT_REDIRECT')) throw e;
      setError('Upload failed. Check your connection and try again.');
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
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
        <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" required className="input" />
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, or PDF. Photos are shrunk automatically. Max 3MB.</p>
      </div>
      {error && <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}
      <UploadButton />
    </form>
  );
}
