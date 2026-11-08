'use client';

import { useRef, useState, useTransition } from 'react';
import { updateBorrowerPhotoAction, removeBorrowerPhotoAction } from '@/lib/actions';

/** Shrinks the picked photo to max 480px JPEG so it uploads fast and fits the limit. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/** Round profile picture with a ✏️ edit button at the bottom: change the photo, or remove it. */
export default function ProfilePhoto({ borrowerId, name, version }: { borrowerId: number; name: string; version: number | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError('');
    setBusy(true);
    setMenu(false);
    const small = await shrink(f);
    if (small.size > 2 * 1024 * 1024) {
      setBusy(false);
      setError('Photo is too large.');
      return;
    }
    const fd = new FormData();
    fd.set('photo', small);
    start(async () => {
      try {
        await updateBorrowerPhotoAction(borrowerId, fd);
      } catch (err: any) {
        if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err;
        setError('Upload failed. Try again.');
      } finally {
        setBusy(false);
      }
    });
  }

  return (
    <div className="relative flex-shrink-0 w-24 h-24">
      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-tealight flex items-center justify-center text-3xl font-bold text-teal">
        {version ? (
          <img src={`/api/borrower-photo/${borrowerId}?v=${version}`} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0)
        )}
        {(busy || pending) && <div className="absolute inset-0 rounded-full bg-black/50 text-white text-xs flex items-center justify-center">Saving…</div>}
      </div>

      <button
        type="button"
        onClick={() => setMenu((m) => !m)}
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-navy text-white text-sm shadow-lg border-2 border-white flex items-center justify-center hover:bg-teal"
        aria-label="Edit photo"
      >
        ✏️
      </button>

      {menu && (
        <div className="absolute z-20 top-full mt-2 left-1/2 -translate-x-1/2 w-40 rounded-xl bg-white shadow-xl border border-gray-200 p-1 text-sm">
          <button type="button" onClick={() => input.current?.click()} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">📷 {version ? 'Change photo' : 'Add photo'}</button>
          {version && (
            <button
              type="button"
              onClick={() => start(async () => { try { await removeBorrowerPhotoAction(borrowerId); } catch (err: any) { if (err?.digest?.startsWith?.('NEXT_REDIRECT')) throw err; } })}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600"
            >
              🗑 Remove photo
            </button>
          )}
        </div>
      )}

      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onPick} className="hidden" />
      {error && <p className="absolute top-full mt-9 left-0 w-44 text-xs text-red-600">{error}</p>}
    </div>
  );
}
