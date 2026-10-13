import Link from 'next/link';
import DateInput from '@/app/(app)/DateInput';

/** Search form shared by the list pages: text search, member-ID group ("1-20, 25"), and a date range. */
export default function FilterBar({
  basePath,
  q,
  ids,
  from,
  to,
  dateLabel = 'Date',
  qPlaceholder = 'Search...',
  showDates = true,
  children,
}: {
  basePath: string;
  q?: string;
  ids?: string;
  from?: string;
  to?: string;
  dateLabel?: string;
  qPlaceholder?: string;
  showDates?: boolean;
  children?: React.ReactNode;
}) {
  const active = !!(q || ids || from || to);
  return (
    <form className="flex gap-2 flex-wrap items-end mb-2 flex-shrink-0">
      <div>
        <label className="text-[10px] text-gray-500 block leading-tight">Search</label>
        <input name="q" defaultValue={q} placeholder={qPlaceholder} className="input w-40 !py-1 !text-sm" />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 block leading-tight">Member ID group</label>
        <input name="ids" defaultValue={ids} placeholder="e.g. 1-20, 25" className="input w-32 !py-1 !text-sm" />
      </div>
      {showDates && (
        <>
          <div>
            <label className="text-[10px] text-gray-500 block leading-tight">{dateLabel} from</label>
            <DateInput name="from" defaultValue={from} className="input w-32 !py-1 !text-sm" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block leading-tight">{dateLabel} to</label>
            <DateInput name="to" defaultValue={to} className="input w-32 !py-1 !text-sm" />
          </div>
        </>
      )}
      {children}
      <button className="btn btn-primary !py-1.5 !px-3 text-sm">🔍 Search</button>
      {active && <Link href={basePath} className="btn btn-outline !py-1.5 !px-3 text-sm">Clear</Link>}
    </form>
  );
}
