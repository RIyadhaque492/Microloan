'use client';

/** Small "Order: Newest → Oldest / Oldest → Newest" dropdown for a table or list. Applies as soon as it is changed and
 *  keeps the other query values (pass them in `keep`). Used on pages that have no search bar of their own. */
export default function OrderBar({ order = '', keep = {}, label = 'Order' }: { order?: string; keep?: Record<string, string | undefined>; label?: string }) {
  return (
    <form className="inline-flex items-center gap-1.5">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="text-[11px] text-gray-500 font-normal">{label}</label>
      <select
        name="order"
        defaultValue={order || ''}
        aria-label="Sort order"
        className="input !py-1 !px-2 !text-xs w-36"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">Default order</option>
        <option value="desc">Newest → Oldest</option>
        <option value="asc">Oldest → Newest</option>
      </select>
    </form>
  );
}
