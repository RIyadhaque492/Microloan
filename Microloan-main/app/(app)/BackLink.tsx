'use client';

import { useRouter } from 'next/navigation';

export default function BackLink() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      type="button"
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-navy text-lg leading-none flex-shrink-0 shadow-sm hover:bg-gray-50 active:scale-95 transition"
    >
      ←
    </button>
  );
}
