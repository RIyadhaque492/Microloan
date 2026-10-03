'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/** Big green tick shown after a loan is registered. */
export default function RegisteredToast() {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      router.replace(pathname); // drop ?registered=1 so a refresh doesn't show it again
    }, 2200);
    return () => clearTimeout(t);
  }, [router, pathname]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/30 flex items-center justify-center px-4" onClick={() => setVisible(false)}>
      <div className="bg-white rounded-2xl shadow-2xl px-8 py-7 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500 text-white text-5xl flex items-center justify-center mx-auto mb-3">✓</div>
        <div className="text-lg font-bold text-green-700">Registered successfully</div>
      </div>
    </div>
  );
}
