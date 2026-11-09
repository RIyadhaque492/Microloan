import { sql } from '@/lib/db';

export { CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, AUTO_CATEGORIES } from './cashCategories';

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
 * Every cash movement as one list:
 *   automatic (always matches the rest of the system, nothing to type twice)
 *     IN : loan collections, savings deposits, processing fees, registration fees
 *     OUT: loan disbursements, savings withdrawals
 *   manual   (cash_entries — salary, rent, capital, bank deposit ...)
 * Loans/members in the Bin are left out, exactly like in the reports.
 */
const ENTRIES = `
  WITH e AS (
    SELECT c.payment_date::date AS d, 'in'::text AS dir, 'Loan Collection'::text AS category,
           ('Loan collection - ' || b.full_name || ' (' || b.borrower_code || ') - ' || l.loan_code || COALESCE(' - ' || NULLIF(c.notes, ''), ''))::text AS particulars,
           c.receipt_no::text AS ref, ('/collections/receipt/' || c.id)::text AS href,
           c.amount_paid::numeric AS amount, 'auto'::text AS source, c.id::int AS rid, 1::int AS ord
    FROM collections c JOIN loans l ON l.id = c.loan_id JOIN borrowers b ON b.id = c.borrower_id
    WHERE l.deleted_at IS NULL AND b.deleted_at IS NULL
    UNION ALL
    SELECT st.transaction_date::date, CASE WHEN st.type = 'deposit' THEN 'in' ELSE 'out' END,
           CASE WHEN st.type = 'deposit' THEN 'Savings Deposit' ELSE 'Savings Withdrawal' END,
           (CASE WHEN st.type = 'deposit' THEN 'Savings deposit - ' ELSE 'Savings withdrawal - ' END || b.full_name || ' (' || b.borrower_code || ')' || COALESCE(' - ' || NULLIF(st.notes, ''), '')),
           COALESCE(st.receipt_no, ''), '/savings/' || b.id, st.amount, 'auto', st.id, 2
    FROM savings_transactions st JOIN borrowers b ON b.id = st.borrower_id
    WHERE b.deleted_at IS NULL
    UNION ALL
    SELECT l.disbursement_date::date, 'out', 'Loan Disbursement',
           'Loan disbursed - ' || b.full_name || ' (' || b.borrower_code || ') - ' || l.loan_code,
           l.loan_code, '/loans/' || l.id, l.loan_amount, 'auto', l.id, 3
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.status IN ('active', 'completed', 'defaulted') AND l.deleted_at IS NULL AND b.deleted_at IS NULL AND l.disbursement_date IS NOT NULL
    UNION ALL
    SELECT l.disbursement_date::date, 'in', 'Processing Fee',
           'Processing fee - ' || b.full_name || ' (' || b.borrower_code || ') - ' || l.loan_code,
           l.loan_code, '/loans/' || l.id, l.processing_fee, 'auto', l.id, 4
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.status IN ('active', 'completed', 'defaulted') AND l.deleted_at IS NULL AND b.deleted_at IS NULL AND l.disbursement_date IS NOT NULL AND l.processing_fee > 0
    UNION ALL
    SELECT b.created_at::date, 'in', 'Registration Fee',
           'Registration fee - ' || b.full_name || ' (' || b.borrower_code || ')',
           COALESCE(b.fee_receipt_no, ''), '/borrowers/' || b.id, b.registration_fee, 'auto', b.id, 5
    FROM borrowers b
    WHERE b.deleted_at IS NULL AND b.registration_fee > 0
    UNION ALL
    SELECT m.entry_date::date, m.direction, m.category, m.description, '', '', m.amount, 'manual', m.id, 6
    FROM cash_entries m
  )
`;

export type CashRow = {
  d: string; dir: 'in' | 'out'; category: string; particulars: string; ref: string; href: string;
  amount: number; source: 'auto' | 'manual'; rid: number; balance: number | null;
};

const isoDay = (v: any) => (v instanceof Date ? v.toLocaleDateString('en-CA') : String(v).slice(0, 10));
const cents = (v: any) => Math.round(Number(v) * 100);

export async function getCashBook(opts: { from?: string; to?: string; category?: string; source?: string; search?: string }) {
  await ensureCashTable();
  const from = /^\d{4}-\d{2}-\d{2}$/.test(opts.from || '') ? opts.from! : null;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(opts.to || '') ? opts.to! : null;
  const category = opts.category || null;
  const source = opts.source === 'auto' || opts.source === 'manual' ? opts.source : null;
  const search = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
  const filtered = !!(category || source || search);

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
      `SELECT d, dir, category, particulars, ref, href, amount, source, rid FROM e
       WHERE ($1::date IS NULL OR d >= $1::date) AND ($2::date IS NULL OR d <= $2::date)
         AND ($3::text IS NULL OR category = $3::text) AND ($4::text IS NULL OR source = $4::text)
         AND ($5::text IS NULL OR particulars ILIKE $5::text)
       ORDER BY d ASC, ord ASC, rid ASC`,
    [from, to, category, source, search]
  );

  let run = openingCents;
  let inC = 0;
  let outC = 0;
  const rows: CashRow[] = raw.map((r: any) => {
    const a = cents(r.amount);
    if (r.dir === 'in') { run += a; inC += a; } else { run -= a; outC += a; }
    return {
      d: isoDay(r.d), dir: r.dir, category: r.category, particulars: r.particulars, ref: r.ref || '', href: r.href || '',
      amount: a / 100, source: r.source, rid: Number(r.rid), balance: filtered ? null : run / 100,
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
