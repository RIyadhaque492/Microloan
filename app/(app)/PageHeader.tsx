'use client';

import { useRouter } from 'next/navigation';

export default function PageHeader({
  title,
  action,
  showBack = true,
}: {
  title: string;
  action?: React.ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-navy text-lg leading-none flex-shrink-0 shadow-sm hover:bg-gray-50 active:scale-95 transition"
          >
            ←
          </button>
        )}
        <h1 className="text-xl font-bold text-navy truncate">{title}</h1>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
