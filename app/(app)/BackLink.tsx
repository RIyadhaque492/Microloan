'use client';

import { useRouter } from 'next/navigation';

export default function BackLink() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      type="button"
      className="text-gray-400 hover:text-navy text-xl leading-none px-1 pt-1 flex-shrink-0"
    >
      ←
    </button>
  );
}
