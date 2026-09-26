'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/** A confirming pop-up shown right after a document upload succeeds — added because
 *  the upload itself could succeed with no visible sign of it beyond a new thumbnail
 *  appearing further down the page, which read as "nothing happened" / "not working". */
export default function UploadSuccessToast() {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      // Strip the ?uploaded=1 flag so refreshing the page doesn't re-show the popup.
      router.replace(`${pathname}#documents`);
    }, 2500);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pointer-events-none pt-20 px-3">
      <div className="pointer-events-auto bg-green-600 text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
        <span className="text-xl">✅</span>
        <span className="font-semibold text-sm">Document uploaded successfully!</span>
        <button onClick={() => setVisible(false)} className="ml-2 text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>
    </div>
  );
}
