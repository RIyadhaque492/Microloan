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
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            type="button"
            className="text-gray-400 hover:text-navy text-xl leading-none px-1 flex-shrink-0"
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
