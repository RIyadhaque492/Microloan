'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Banner() {
  const error = useSearchParams().get('error');
  if (!error || !error.startsWith('Wrong password')) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 shadow-lg">
      🔒 {error}
    </div>
  );
}

export default function WrongPasswordBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
