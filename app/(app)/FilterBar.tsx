import Link from 'next/link';

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
    <form className="flex gap-2 flex-wrap items-end mb-3 flex-shrink-0">
      <div>
        <label className="text-[11px] text-gray-500 block mb-0.5">Search</label>
        <input name="q" defaultValue={q} placeholder={qPlaceholder} className="input w-44" />
      </div>
      <div>
        <label className="text-[11px] text-gray-500 block mb-0.5">Member ID group</label>
        <input name="ids" defaultValue={ids} placeholder="e.g. 1-20, 25" className="input w-36" />
      </div>
      {showDates && (
        <>
          <div>
            <label className="text-[11px] text-gray-500 block mb-0.5">{dateLabel} from</label>
            <input name="from" type="date" defaultValue={from} className="input w-36" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-0.5">{dateLabel} to</label>
            <input name="to" type="date" defaultValue={to} className="input w-36" />
          </div>
        </>
      )}
      {children}
      <button className="btn btn-primary">🔍 Search</button>
      {active && <Link href={basePath} className="btn btn-outline">Clear</Link>}
    </form>
  );
}
