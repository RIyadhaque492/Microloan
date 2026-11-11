import { sql } from '@/lib/db';

export { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES } from './cashCategories';

const q = (text: string, params: any[] = []) => (sql as any)(text, params) as Promise<any[]>;

export async function ensureCashTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS cash_entries (
      id SERIAL PRIMARY KEY,
      entry_date DATE NOT NULL,
      direction VARCHAR(3) NOT NULL,
      category VARCHAR(60) NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      amount NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    )`;
}

/**
 * The Cash Book is entirely manual: it contains only what the admin types in (cash_entries).
 * Nothing is read from loans, collections, savings or fees.
 */
const ENTRIES = `
  WITH e AS (
    SELECT m.entry_date::date AS d, m.direction::text AS dir, m.category::text AS category, m.description::text AS particulars,
           m.amount::numeric AS amount, m.id::int AS rid
    FROM cash_entries m
  )
`;

export type CashRow = {
  d: string; dir: 'in' | 'out'; category: string; particulars: string;
  amount: number; rid: number; balance: number | null;
};

const isoDay = (v: any) => (v instanceof Date ? v.toLocaleDateString('en-CA') : String(v).slice(0, 10));
const cents = (v: any) => Math.round(Number(v) * 100);

export async function getCashBook(opts: { from?: string; to?: string; category?: string; search?: string }) {
  await ensureCashTable();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(opts.from || '') ? opts.from! : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(opts.to || '') ? opts.to! : null;
  const category = opts.category || null;
  const search = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
  const filtered = !!(category || search);

  // balance brought forward = everything before the first day shown (only meaningful with no filters)
  let openingCents = 0;
  if (from && !filtered) {
    const [r] = await q(
      ENTRIES + `SELECT COALESCE(SUM(CASE WHEN dir = 'in' THEN amount ELSE -amount END), 0) AS bal FROM e WHERE d < $1::date`,
      [from]
    );
    openingCents = cents(r?.bal || 0);
  }

  const raw = await q(
    ENTRIES +
      `SELECT d, dir, category, particulars, amount, rid FROM e
       WHERE ($1::date IS NULL OR d >= $1::date) AND ($2::date IS NULL OR d <= $2::date)
         AND ($3::text IS NULL OR category = $3::text)
         AND ($4::text IS NULL OR particulars ILIKE $4::text OR category ILIKE $4::text)
       ORDER BY d ASC, rid ASC`,
    [from, to, category, search]
  );

  let run = openingCents;
  let inC = 0;
  let outC = 0;
  const rows: CashRow[] = raw.map((r: any) => {
    const a = cents(r.amount);
    if (r.dir === 'in') { run += a; inC += a; } else { run -= a; outC += a; }
    return {
      d: isoDay(r.d), dir: r.dir, category: r.category, particulars: r.particulars,
      amount: a / 100, rid: Number(r.rid), balance: filtered ? null : run / 100,
    };
  });

  return {
    rows, filtered,
    opening: openingCents / 100, totalIn: inC / 100, totalOut: outC / 100,
    closing: (openingCents + inC - outC) / 100,
  };
}

export async function getCashEntry(id: number) {
  await ensureCashTable();
  const [e] = await sql`SELECT id, entry_date, direction, category, description, amount FROM cash_entries WHERE id = ${id}`;
  return e || null;
}

/** Categories already used in the book (so custom ones can be filtered on too). */
export async function getUsedCashCategories(): Promise<string[]> {
  await ensureCashTable();
  const rows = await sql`SELECT DISTINCT category FROM cash_entries ORDER BY category ASC`;
  return rows.map((r: any) => String(r.category));
}
