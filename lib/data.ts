import { sql } from './db';

export async function getDashboardStats() {
  const [borrowerCount] = await sql`SELECT COUNT(*)::int AS c FROM borrowers WHERE deleted_at IS NULL`;
  const [activeLoans] = await sql`SELECT COUNT(*)::int AS c FROM loans WHERE status = 'active' AND deleted_at IS NULL`;
  const [disbursed] = await sql`SELECT COALESCE(SUM(loan_amount),0) AS s FROM loans WHERE status IN ('active','completed','defaulted') AND deleted_at IS NULL`;
  const [collected] = await sql`SELECT COALESCE(SUM(c.amount_paid),0) AS s FROM collections c JOIN loans l ON l.id = c.loan_id WHERE l.deleted_at IS NULL`;
  const [payableRow] = await sql`SELECT COALESCE(SUM(total_payable),0) AS s FROM loans WHERE status IN ('active','completed','defaulted') AND deleted_at IS NULL`;
  const [procFees] = await sql`SELECT COALESCE(SUM(processing_fee),0) AS s FROM loans WHERE deleted_at IS NULL AND status != 'draft'`;
  const [overdueCount] = await sql`SELECT COUNT(*)::int AS c FROM loan_installments li JOIN loans l ON l.id = li.loan_id WHERE li.status = 'overdue' AND l.deleted_at IS NULL`;
  const [pendingLoans] = await sql`SELECT COUNT(*)::int AS c FROM loans WHERE status = 'pending' AND deleted_at IS NULL`;
  const [outstanding] = await sql`
    SELECT COALESCE(SUM(li.amount - li.paid_amount),0) AS s FROM loan_installments li JOIN loans l ON l.id = li.loan_id
    WHERE li.status IN ('pending','partial','overdue') AND l.deleted_at IS NULL
  `;
  const [savingsTotal] = await sql`
    SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS s FROM savings_transactions
  `;
  const [otherRevenue] = await sql`SELECT COALESCE(SUM(registration_fee), 0) AS s FROM borrowers WHERE deleted_at IS NULL`;

  const recentLoans = await sql`
    SELECT l.*, b.full_name FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.deleted_at IS NULL
    ORDER BY l.created_at DESC LIMIT 6
  `;

  const upcoming = await sql`
    SELECT li.*, l.loan_code, b.full_name, b.phone FROM loan_installments li
    JOIN loans l ON l.id = li.loan_id
    JOIN borrowers b ON b.id = l.borrower_id
    WHERE li.status IN ('pending','overdue') AND li.due_date <= (CURRENT_DATE + INTERVAL '7 days')
    ORDER BY li.due_date ASC LIMIT 8
  `;

  return {
    totalBorrowers: borrowerCount.c,
    activeLoans: activeLoans.c,
    totalDisbursed: Number(disbursed.s),
    totalCollected: Number(collected.s),
    overdueCount: overdueCount.c,
    pendingLoans: pendingLoans.c,
    outstanding: Number(outstanding.s),
    savingsTotal: Number(savingsTotal.s),
    otherRevenue: Number(otherRevenue.s) + Number(procFees.s),
    totalPayable: Number(payableRow.s),
    recentLoans,
    upcoming,
  };
}

export async function refreshOverdueInstallments() {
  await sql`UPDATE loan_installments SET status = 'overdue' WHERE status = 'pending' AND due_date < CURRENT_DATE`;
}

export async function generateDueNotifications() {
  await refreshOverdueInstallments();

  const dueSoon = await sql`
    SELECT li.id AS inst_id, li.loan_id, li.due_date, li.amount, l.loan_code, l.borrower_id, b.full_name
    FROM loan_installments li
    JOIN loans l ON l.id = li.loan_id
    JOIN borrowers b ON b.id = l.borrower_id
    WHERE li.status = 'pending' AND li.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '3 days')
  `;

  for (const row of dueSoon) {
    const [exists] = await sql`
      SELECT id FROM notifications WHERE loan_id = ${row.loan_id} AND type = 'due_soon'
      AND created_at::date = CURRENT_DATE AND message LIKE ${'%#' + row.inst_id + ' %'}
    `;
    if (!exists) {
      const msg = `Installment #${row.inst_id} of ${Number(row.amount).toFixed(2)} for loan ${row.loan_code} (${row.full_name}) is due on ${row.due_date}.`;
      await sql`
        INSERT INTO notifications (loan_id, borrower_id, title, message, type)
        VALUES (${row.loan_id}, ${row.borrower_id}, 'Installment due soon', ${msg}, 'due_soon')
      `;
    }
  }

  const overdue = await sql`
    SELECT li.id AS inst_id, li.loan_id, li.due_date, li.amount, l.loan_code, l.borrower_id, b.full_name
    FROM loan_installments li
    JOIN loans l ON l.id = li.loan_id
    JOIN borrowers b ON b.id = l.borrower_id
    WHERE li.status = 'overdue'
  `;

  for (const row of overdue) {
    const [exists] = await sql`
      SELECT id FROM notifications WHERE loan_id = ${row.loan_id} AND type = 'overdue'
      AND created_at::date = CURRENT_DATE AND message LIKE ${'%#' + row.inst_id + ' %'}
    `;
    if (!exists) {
      const msg = `Installment #${row.inst_id} of ${Number(row.amount).toFixed(2)} for loan ${row.loan_code} (${row.full_name}) was due on ${row.due_date} and is now overdue.`;
      await sql`
        INSERT INTO notifications (loan_id, borrower_id, title, message, type)
        VALUES (${row.loan_id}, ${row.borrower_id}, 'Installment overdue', ${msg}, 'overdue')
      `;
    }
  }
}

export async function getUnreadNotificationCount() {
  const [row] = await sql`SELECT COUNT(*)::int AS c FROM notifications WHERE is_read = false`;
  return row.c as number;
}

export async function getNotifications(type?: string) {
  if (type) {
    return sql`SELECT * FROM notifications WHERE type = ${type} ORDER BY is_read ASC, created_at DESC LIMIT 100`;
  }
  return sql`SELECT * FROM notifications ORDER BY is_read ASC, created_at DESC LIMIT 100`;
}

export async function getNextMemberId(): Promise<string> {
  // Only consider purely-numeric codes (older data may still have the old BOR-YYMMDD-XXXXX format) —
  // default to 100 so the first suggested ID is 101.
  const [row] = await sql`
    SELECT COALESCE(MAX(borrower_code::int), 100) AS max_id FROM borrowers WHERE borrower_code ~ '^[0-9]+$'
  `;
  return String(Number(row.max_id) + 1);
}

/** Distinct present addresses already on file, most recently used first — powers the
 *  autosuggest datalist on the Add Member form so repeat addresses (same village/area)
 *  don't need retyping from scratch. */
export async function getPresentAddressSuggestions(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT present_address FROM borrowers
    WHERE present_address IS NOT NULL AND present_address != '' AND deleted_at IS NULL
    ORDER BY present_address ASC LIMIT 100
  `) as any[];
  return rows.map((r) => r.present_address);
}

/** Distinct monthly income values already on file — powers the autosuggest datalist
 *  on the Add Member form so common income bands are one click away. */
export async function getMonthlyIncomeSuggestions(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT monthly_income FROM borrowers
    WHERE monthly_income IS NOT NULL AND monthly_income > 0 AND deleted_at IS NULL
    ORDER BY monthly_income ASC LIMIT 100
  `) as any[];
  return rows.map((r) => String(Number(r.monthly_income)));
}

/** Distinct payment/collection notes already on file — powers autosuggest datalists
 *  on Notes fields across the app (Collect Payment, Edit Payment, etc.). */
export async function getCollectionNotesSuggestions(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT notes FROM collections
    WHERE notes IS NOT NULL AND notes != ''
    ORDER BY notes ASC LIMIT 100
  `) as any[];
  return rows.map((r) => r.notes);
}

/** Values already used for member text fields — powers the suggestion lists on the member forms. */
export async function getMemberFieldSuggestions() {
  const col = async (rows: any[], key: string) => rows.map((r) => String(r[key])).filter(Boolean);
  const [fathers, jobs, guarantors] = await Promise.all([
    sql`SELECT father_name AS v, COUNT(*) AS n FROM borrowers WHERE father_name IS NOT NULL AND father_name != '' AND deleted_at IS NULL GROUP BY father_name ORDER BY n DESC, v ASC LIMIT 60`,
    sql`SELECT occupation AS v, COUNT(*) AS n FROM borrowers WHERE occupation IS NOT NULL AND occupation != '' AND deleted_at IS NULL GROUP BY occupation ORDER BY n DESC, v ASC LIMIT 60`,
    sql`SELECT guarantor_name AS v, COUNT(*) AS n FROM borrowers WHERE guarantor_name IS NOT NULL AND guarantor_name != '' AND deleted_at IS NULL GROUP BY guarantor_name ORDER BY n DESC, v ASC LIMIT 60`,
  ]);
  return {
    fathers: await col(fathers as any[], 'v'),
    occupations: [...new Set(['Farmer', 'Small business', 'Shopkeeper', 'Day labourer', 'Housewife', 'Driver', 'Tailor', ...(await col(jobs as any[], 'v'))])],
    guarantors: await col(guarantors as any[], 'v'),
  };
}

/** Loan purposes already used — powers the suggestion list on Loan Registration. */
export async function getLoanPurposeSuggestions(): Promise<string[]> {
  const rows = (await sql`
    SELECT purpose, COUNT(*) AS n FROM loans
    WHERE purpose IS NOT NULL AND purpose != ''
    GROUP BY purpose ORDER BY n DESC, purpose ASC LIMIT 50
  `) as any[];
  return rows.map((r) => r.purpose);
}

/** Distinct savings transaction notes already on file — powers the autosuggest
 *  datalist on the Savings deposit/withdrawal form. */
export async function getSavingsNotesSuggestions(): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT notes FROM savings_transactions
    WHERE notes IS NOT NULL AND notes != ''
    ORDER BY notes ASC LIMIT 100
  `) as any[];
  return rows.map((r) => r.notes);
}

export async function getBorrowers(search?: string) {
  if (search) {
    const like = `%${search}%`;
    return sql`
      SELECT b.*, (SELECT COUNT(*)::int FROM loans l WHERE l.borrower_id = b.id) AS loan_count,
        (SELECT COUNT(*)::int FROM loan_installments li JOIN loans l ON l.id = li.loan_id
           WHERE l.borrower_id = b.id AND li.status = 'overdue') AS overdue_count
      FROM borrowers b
      WHERE b.deleted_at IS NULL AND (b.full_name ILIKE ${like} OR b.phone ILIKE ${like} OR b.borrower_code ILIKE ${like} OR b.nid_number ILIKE ${like})
      ORDER BY b.created_at DESC
    `;
  }
  return sql`
    SELECT b.*, (SELECT COUNT(*)::int FROM loans l WHERE l.borrower_id = b.id) AS loan_count,
      (SELECT COUNT(*)::int FROM loan_installments li JOIN loans l ON l.id = li.loan_id
         WHERE l.borrower_id = b.id AND li.status = 'overdue') AS overdue_count
    FROM borrowers b WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC
  `;
}

export async function getBorrower(id: number) {
  const [borrower] = await sql`SELECT * FROM borrowers WHERE id = ${id}`;
  return borrower || null;
}

export async function getLoansForBorrower(borrowerId: number) {
  const rows = (await sql`
    SELECT l.*,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count,
      COALESCE((SELECT SUM(li.paid_amount) FROM loan_installments li WHERE li.loan_id = l.id), 0) AS total_paid,
      (SELECT MAX(c.payment_date) FROM collections c WHERE c.loan_id = l.id) AS last_payment_date
    FROM loans l WHERE l.borrower_id = ${borrowerId} AND l.deleted_at IS NULL ORDER BY l.created_at DESC
  `) as any[];
  return rows.map((r) => ({ ...r, total_paid: Number(r.total_paid), remaining_balance: Math.max(0, Number(r.total_payable) - Number(r.total_paid)) }));
}

/** Soft-deleted members and loans — the "Bin". Restoring puts them straight back
 *  into every normal list, since nothing about them is ever actually destroyed. */
export async function getBinContents() {
  const borrowers = await sql`
    SELECT * FROM borrowers WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC
  `;
  const loans = await sql`
    SELECT l.*, b.full_name, b.borrower_code, b.deleted_at AS borrower_deleted_at
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.deleted_at IS NOT NULL ORDER BY l.deleted_at DESC
  `;
  return { borrowers, loans };
}

export async function getLoans(search?: string, status?: string) {
  const like = search ? `%${search}%` : null;
  const rows = (await sql`
    SELECT l.*, b.full_name, b.phone, b.borrower_code,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count,
      COALESCE((SELECT SUM(li.paid_amount) FROM loan_installments li WHERE li.loan_id = l.id), 0) AS total_paid
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.deleted_at IS NULL
      AND (${like}::text IS NULL OR b.full_name ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like} OR b.borrower_code ILIKE ${like})
      AND (${status || null}::text IS NULL OR l.status = ${status || null})
    ORDER BY l.created_at DESC
  `) as any[];

  return rows.map((r) => ({
    ...r,
    total_paid: Number(r.total_paid),
    remaining_balance: Math.max(0, Number(r.total_payable) - Number(r.total_paid)),
  }));
}

export async function getLoan(id: number) {
  const [loan] = await sql`
    SELECT l.*, b.full_name, b.phone, b.borrower_code, b.id AS borrower_id
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id WHERE l.id = ${id}
  `;
  if (!loan) return null;
  const installments = await sql`
    SELECT li.*, c.id AS receipt_id, c.receipt_no
    FROM loan_installments li
    LEFT JOIN collections c ON c.installment_id = li.id
    WHERE li.loan_id = ${id} ORDER BY li.installment_no ASC
  `;
  const payments = await sql`SELECT * FROM collections WHERE loan_id = ${id} ORDER BY id ASC`;
  return { loan, installments, payments };
}

/**
 * Loan Collection list. Each row carries `due_now` (installments already due and unpaid)
 * so the page can show a RED Collect button, which turns GREEN once everything due
 * has been collected and goes RED again when the next due date arrives.
 * Sorted FIFO: loans that need collecting first (oldest due date first), collected last.
 * `date` (YYYY-MM-DD) limits the list to loans that received a payment on that day.
 */
export async function getActiveLoansWithBalance(search?: string, date?: string) {
  const like = search ? `%${search}%` : null;
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const rows = (await sql`
    SELECT l.id, l.loan_code, l.status, b.full_name, b.phone, b.borrower_code,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS due_count,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial') AND li.due_date <= CURRENT_DATE) AS due_now,
      (SELECT COALESCE(SUM(li.amount - li.paid_amount),0) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS balance,
      (SELECT COALESCE(SUM(li.paid_amount),0) FROM loan_installments li WHERE li.loan_id = l.id) AS total_paid,
      (SELECT MAX(c.payment_date) FROM collections c WHERE c.loan_id = l.id) AS last_payment_date,
      (SELECT c.amount_paid FROM collections c WHERE c.loan_id = l.id ORDER BY c.payment_date DESC, c.id DESC LIMIT 1) AS last_payment_amount,
      (SELECT COALESCE(SUM(c.amount_paid),0) FROM collections c WHERE c.loan_id = l.id AND c.payment_date = ${d}::date) AS collected_on_date,
      (SELECT MIN(li.due_date) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS next_due
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.deleted_at IS NULL AND b.deleted_at IS NULL
      AND (l.status = 'active' OR (${d}::date IS NOT NULL AND l.status = 'completed'))
      AND (${like}::text IS NULL OR b.full_name ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like} OR b.borrower_code ILIKE ${like})
      AND (${d}::date IS NULL OR EXISTS (SELECT 1 FROM collections c2 WHERE c2.loan_id = l.id AND c2.payment_date = ${d}::date))
  `) as any[];

  const mapped = rows
    .filter((r) => d || r.due_count > 0)
    .map((r) => {
      const needsCollection = !d && (r.due_now > 0 || !r.last_payment_date);
      return { ...r, needs_collection: needsCollection };
    });

  const t = (v: any) => (v ? new Date(v).getTime() : 0);
  return mapped.sort((a, b) => {
    if (a.needs_collection !== b.needs_collection) return a.needs_collection ? -1 : 1;
    if (a.needs_collection) return t(a.next_due) - t(b.next_due); // FIFO: oldest due first
    return t(b.last_payment_date) - t(a.last_payment_date); // collected: newest last-payment first
  });
}

export async function getRecentPayments() {
  return sql`
    SELECT c.*, b.full_name, l.loan_code FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id JOIN loans l ON l.id = c.loan_id
    ORDER BY c.created_at DESC LIMIT 10
  `;
}

export async function getLoanForCollection(loanId: number) {
  const [loan] = await sql`
    SELECT l.id, l.loan_code, l.status, l.loan_amount, l.total_payable, l.disbursement_date, b.full_name, b.phone, b.borrower_code, b.id AS borrower_id
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id WHERE l.id = ${loanId}
  `;
  if (!loan) return null;
  const installments = await sql`
    SELECT * FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid' ORDER BY installment_no ASC
  `;
  const [lastPayment] = await sql`
    SELECT amount_paid, payment_date, payment_method, notes FROM collections WHERE loan_id = ${loanId} ORDER BY payment_date DESC, id DESC LIMIT 1
  `;
  const [{ total_paid }] = await sql`
    SELECT COALESCE(SUM(paid_amount),0) AS total_paid FROM loan_installments WHERE loan_id = ${loanId}
  `;
  // Member-based: payment method and notes start as whatever was last entered for THIS member.
  // (The amount is loan-based — it comes from the selected installment, not from the last input.)
  const [memberLast] = await sql`
    SELECT payment_method, notes FROM collections WHERE borrower_id = ${loan.borrower_id} ORDER BY id DESC LIMIT 1
  `;
  const lastInput = memberLast ? { method: memberLast.payment_method || 'cash', notes: memberLast.notes || '' } : null;
  return { loan, installments, lastPayment: lastPayment || null, totalPaid: Number(total_paid), lastInput };
}

export async function getSiteSettings() {
  try {
    const [row] = await sql`SELECT * FROM site_settings WHERE id = 1`;
    return row || null;
  } catch {
    // Table doesn't exist yet (migration not run) or another transient DB issue —
    // fail gracefully so the public homepage shows sensible defaults instead of crashing.
    return null;
  }
}

export async function getBorrowerDocuments(borrowerId: number) {
  return sql`
    SELECT id, borrower_id, doc_title, doc_type, file_name, mime_type, file_size, uploaded_at
    FROM borrower_documents WHERE borrower_id = ${borrowerId} ORDER BY uploaded_at DESC
  `;
}

export async function getPaymentsForBorrower(borrowerId: number) {
  return sql`
    SELECT c.*, l.loan_code FROM collections c JOIN loans l ON l.id = c.loan_id
    WHERE c.borrower_id = ${borrowerId} ORDER BY c.payment_date DESC
  `;
}

/**
 * Every member's credit/debt summary. Only loans that were actually disbursed
 * (active, completed, defaulted) count toward "borrowed" — 'approved' hasn't been
 * disbursed yet, and 'defaulted' must still count as debt.
 */
export async function getCreditSummary(search?: string) {
  const like = search ? `%${search}%` : null;
  const rows = like
    ? await sql`
        SELECT b.id, b.borrower_code, b.full_name, b.phone, b.email, b.nid_number, b.status AS borrower_status,
          COALESCE((SELECT SUM(l.loan_amount) FROM loans l WHERE l.borrower_id = b.id AND l.status IN ('active','completed','defaulted')), 0) AS total_borrowed,
          COALESCE((SELECT SUM(l.total_payable) FROM loans l WHERE l.borrower_id = b.id AND l.status IN ('active','completed','defaulted')), 0) AS total_payable,
          COALESCE((SELECT SUM(li.paid_amount) FROM loan_installments li JOIN loans l2 ON l2.id = li.loan_id WHERE l2.borrower_id = b.id), 0) AS total_paid,
          (SELECT COUNT(*)::int FROM loans l3 WHERE l3.borrower_id = b.id) AS loan_count,
          (SELECT COUNT(*)::int FROM loan_installments li2 JOIN loans l4 ON l4.id = li2.loan_id WHERE l4.borrower_id = b.id AND li2.status = 'overdue') AS overdue_count
        FROM borrowers b
        WHERE b.deleted_at IS NULL AND (b.full_name ILIKE ${like} OR b.borrower_code ILIKE ${like} OR b.phone ILIKE ${like})
        ORDER BY b.full_name ASC
      `
    : await sql`
        SELECT b.id, b.borrower_code, b.full_name, b.phone, b.email, b.nid_number, b.status AS borrower_status,
          COALESCE((SELECT SUM(l.loan_amount) FROM loans l WHERE l.borrower_id = b.id AND l.status IN ('active','completed','defaulted')), 0) AS total_borrowed,
          COALESCE((SELECT SUM(l.total_payable) FROM loans l WHERE l.borrower_id = b.id AND l.status IN ('active','completed','defaulted')), 0) AS total_payable,
          COALESCE((SELECT SUM(li.paid_amount) FROM loan_installments li JOIN loans l2 ON l2.id = li.loan_id WHERE l2.borrower_id = b.id), 0) AS total_paid,
          (SELECT COUNT(*)::int FROM loans l3 WHERE l3.borrower_id = b.id) AS loan_count,
          (SELECT COUNT(*)::int FROM loan_installments li2 JOIN loans l4 ON l4.id = li2.loan_id WHERE l4.borrower_id = b.id AND li2.status = 'overdue') AS overdue_count
        FROM borrowers b
        WHERE b.deleted_at IS NULL
        ORDER BY b.full_name ASC
      `;

  return (rows as any[]).map((r) => {
    const outstanding = Math.max(0, Number(r.total_payable) - Number(r.total_paid));
    const creditStatus = r.overdue_count > 0 ? 'Overdue' : outstanding > 0 ? 'Active Debt' : 'Clear';
    return { ...r, outstanding_balance: outstanding, credit_status: creditStatus };
  });
}

/** Every member, id/code/name only — used to populate the member picker on the
 *  Single Member report (independent of whether they have any loans yet). */
export async function getBorrowersBasic() {
  return sql`SELECT id, borrower_code, full_name, phone FROM borrowers WHERE deleted_at IS NULL ORDER BY full_name ASC`;
}

/**
 * One row PER LOAN (not per member) — a member with two disbursed loans produces two
 * rows. Only loans that have actually been disbursed (active, completed, defaulted)
 * are included, matching the existing "borrowed" definition used elsewhere in the app.
 * This is the shared data source for both the Single Member and All Members reports,
 * which now use the same unified column set (Opening, SL, Name, Member ID, Loan
 * Amount, Total Payable, Installment Amount, Installment Quantity, Total Paid,
 * Remaining Balance, Maturity Date, Contact Number).
 */
export async function getLoanReportRows(opts: { search?: string; borrowerId?: number } = {}) {
  const { search, borrowerId } = opts;
  const like = search ? `%${search}%` : null;
  const bId = borrowerId || null;

  const rows = (await sql`
    SELECT
      l.id AS loan_id, l.loan_code, l.status AS loan_status,
      l.disbursement_date, l.maturity_date, l.loan_amount, l.total_payable,
      l.installment_amount, l.tenure,
      b.id AS borrower_id, b.borrower_code, b.full_name, b.phone, b.created_at AS membership_date,
      COALESCE((SELECT SUM(CASE WHEN st.type = 'deposit' THEN st.amount ELSE -st.amount END) FROM savings_transactions st WHERE st.borrower_id = b.id), 0) AS savings_raw,
      COALESCE((SELECT SUM(li.paid_amount) FROM loan_installments li WHERE li.loan_id = l.id), 0) AS total_paid,
      (SELECT MAX(c.payment_date) FROM collections c WHERE c.loan_id = l.id) AS last_payment_date,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count
    FROM loans l
    JOIN borrowers b ON b.id = l.borrower_id
    WHERE l.status IN ('active', 'completed', 'defaulted')
      AND l.deleted_at IS NULL AND b.deleted_at IS NULL
      AND (${bId}::int IS NULL OR b.id = ${bId})
      AND (${like}::text IS NULL OR b.full_name ILIKE ${like} OR b.borrower_code ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like})
    ORDER BY b.full_name ASC, l.created_at ASC
  `) as any[];

  // Member serial order (Member ID 1, 2, 3...). Savings are shown once per member (first loan row)
  // so totals never count the same savings twice.
  const serial = (r: any) => {
    const m = /(\d+)\s*$/.exec(String(r.borrower_code ?? ''));
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  rows.sort((a, b) => serial(a) - serial(b) || String(a.full_name).localeCompare(String(b.full_name)));
  const seen = new Set<number>();
  return rows.map((r) => {
    const totalPaid = Number(r.total_paid);
    const totalPayable = Number(r.total_payable);
    const first = !seen.has(r.borrower_id);
    seen.add(r.borrower_id);
    return {
      ...r,
      total_paid: totalPaid,
      remaining_balance: Math.max(0, totalPayable - totalPaid),
      savings_balance: first ? Number(r.savings_raw) : null,
    };
  });
}

export async function getAllUsersFullHistory(search?: string) {
  const summary = await getCreditSummary(search);
  const results = [];
  for (const r of summary as any[]) {
    const loans = await sql`SELECT * FROM loans WHERE borrower_id = ${r.id} ORDER BY created_at DESC`;
    const payments = await sql`
      SELECT c.*, l.loan_code FROM collections c JOIN loans l ON l.id = c.loan_id
      WHERE c.borrower_id = ${r.id} ORDER BY c.payment_date DESC
    `;
    results.push({ ...r, loans, payments });
  }
  return results;
}

// ---------- Savings ----------

export async function getSavingsBalance(borrowerId: number): Promise<number> {
  const [row] = await sql`
    SELECT COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END), 0) AS balance
    FROM savings_transactions WHERE borrower_id = ${borrowerId}
  `;
  return Number(row.balance);
}

export async function getSavingsTransactions(borrowerId: number) {
  return sql`
    SELECT * FROM savings_transactions WHERE borrower_id = ${borrowerId} ORDER BY transaction_date ASC, id ASC
  `;
}

/** Totals for one member (profile cards). */
export async function getSavingsSummary(borrowerId: number) {
  const [row] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposit,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdraw,
      COUNT(*)::int AS receipts,
      MAX(transaction_date) AS last_date
    FROM savings_transactions WHERE borrower_id = ${borrowerId}
  `;
  return { deposit: Number(row.deposit), withdraw: Number(row.withdraw), receipts: Number(row.receipts), lastDate: row.last_date as any };
}

/** Totals across all members (list page cards). "Today" = today's deposits / withdrawals. */
export async function getAllSavingsTotals() {
  const [row] = await sql`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) AS deposit,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS withdraw,
      COALESCE(SUM(CASE WHEN type = 'deposit' AND transaction_date = CURRENT_DATE THEN amount ELSE 0 END), 0) AS deposit_today,
      COALESCE(SUM(CASE WHEN type = 'withdrawal' AND transaction_date = CURRENT_DATE THEN amount ELSE 0 END), 0) AS withdraw_today
    FROM savings_transactions st JOIN borrowers b ON b.id = st.borrower_id WHERE b.deleted_at IS NULL
  `;
  return {
    deposit: Number(row.deposit), withdraw: Number(row.withdraw),
    depositToday: Number(row.deposit_today), withdrawToday: Number(row.withdraw_today),
  };
}

export async function getAllMembersSavings(search?: string) {
  const like = search ? `%${search}%` : null;
  const rows = like
    ? await sql`
        SELECT b.id, b.borrower_code, b.full_name, b.phone,
          COALESCE((SELECT SUM(CASE WHEN st.type = 'deposit' THEN st.amount ELSE -st.amount END) FROM savings_transactions st WHERE st.borrower_id = b.id), 0) AS balance,
          COALESCE((SELECT SUM(st.amount) FROM savings_transactions st WHERE st.borrower_id = b.id AND st.type = 'deposit'), 0) AS total_deposit,
          COALESCE((SELECT SUM(st.amount) FROM savings_transactions st WHERE st.borrower_id = b.id AND st.type = 'withdrawal'), 0) AS total_withdraw,
          (SELECT st4.id FROM savings_transactions st4 WHERE st4.borrower_id = b.id ORDER BY st4.transaction_date DESC, st4.id DESC LIMIT 1) AS last_transaction_id,
          (SELECT COUNT(*)::int FROM savings_transactions st2 WHERE st2.borrower_id = b.id) AS transaction_count,
          (SELECT MAX(st3.transaction_date) FROM savings_transactions st3 WHERE st3.borrower_id = b.id) AS last_savings_date
        FROM borrowers b
        WHERE b.deleted_at IS NULL AND (b.full_name ILIKE ${like} OR b.borrower_code ILIKE ${like} OR b.phone ILIKE ${like})
        ORDER BY b.full_name ASC
      `
    : await sql`
        SELECT b.id, b.borrower_code, b.full_name, b.phone,
          COALESCE((SELECT SUM(CASE WHEN st.type = 'deposit' THEN st.amount ELSE -st.amount END) FROM savings_transactions st WHERE st.borrower_id = b.id), 0) AS balance,
          COALESCE((SELECT SUM(st.amount) FROM savings_transactions st WHERE st.borrower_id = b.id AND st.type = 'deposit'), 0) AS total_deposit,
          COALESCE((SELECT SUM(st.amount) FROM savings_transactions st WHERE st.borrower_id = b.id AND st.type = 'withdrawal'), 0) AS total_withdraw,
          (SELECT st4.id FROM savings_transactions st4 WHERE st4.borrower_id = b.id ORDER BY st4.transaction_date DESC, st4.id DESC LIMIT 1) AS last_transaction_id,
          (SELECT COUNT(*)::int FROM savings_transactions st2 WHERE st2.borrower_id = b.id) AS transaction_count,
          (SELECT MAX(st3.transaction_date) FROM savings_transactions st3 WHERE st3.borrower_id = b.id) AS last_savings_date
        FROM borrowers b
        WHERE b.deleted_at IS NULL
        ORDER BY b.full_name ASC
      `;
  return rows as any[];
}
