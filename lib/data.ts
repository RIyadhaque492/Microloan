import { sql } from './db';

export async function getDashboardStats() {
  const [borrowerCount] = await sql`SELECT COUNT(*)::int AS c FROM borrowers`;
  const [activeLoans] = await sql`SELECT COUNT(*)::int AS c FROM loans WHERE status = 'active'`;
  const [disbursed] = await sql`SELECT COALESCE(SUM(loan_amount),0) AS s FROM loans WHERE status IN ('active','completed','defaulted')`;
  const [collected] = await sql`SELECT COALESCE(SUM(amount_paid),0) AS s FROM collections`;
  const [overdueCount] = await sql`SELECT COUNT(*)::int AS c FROM loan_installments WHERE status = 'overdue'`;
  const [pendingLoans] = await sql`SELECT COUNT(*)::int AS c FROM loans WHERE status = 'pending'`;
  const [outstanding] = await sql`
    SELECT COALESCE(SUM(amount - paid_amount),0) AS s FROM loan_installments WHERE status IN ('pending','partial','overdue')
  `;

  const recentLoans = await sql`
    SELECT l.*, b.full_name FROM loans l JOIN borrowers b ON b.id = l.borrower_id
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

export async function getBorrowers(search?: string) {
  if (search) {
    const like = `%${search}%`;
    return sql`
      SELECT b.*, (SELECT COUNT(*)::int FROM loans l WHERE l.borrower_id = b.id) AS loan_count
      FROM borrowers b
      WHERE b.full_name ILIKE ${like} OR b.phone ILIKE ${like} OR b.borrower_code ILIKE ${like} OR b.nid_number ILIKE ${like}
      ORDER BY b.created_at DESC
    `;
  }
  return sql`
    SELECT b.*, (SELECT COUNT(*)::int FROM loans l WHERE l.borrower_id = b.id) AS loan_count
    FROM borrowers b ORDER BY b.created_at DESC
  `;
}

export async function getBorrower(id: number) {
  const [borrower] = await sql`SELECT * FROM borrowers WHERE id = ${id}`;
  return borrower || null;
}

export async function getLoansForBorrower(borrowerId: number) {
  return sql`SELECT * FROM loans WHERE borrower_id = ${borrowerId} ORDER BY created_at DESC`;
}

export async function getLoans(search?: string, status?: string) {
  const like = search ? `%${search}%` : null;
  if (like && status) {
    return sql`
      SELECT l.*, b.full_name, b.phone,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count
      FROM loans l JOIN borrowers b ON b.id = l.borrower_id
      WHERE (b.full_name ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like}) AND l.status = ${status}
      ORDER BY l.created_at DESC
    `;
  }
  if (like) {
    return sql`
      SELECT l.*, b.full_name, b.phone,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count
      FROM loans l JOIN borrowers b ON b.id = l.borrower_id
      WHERE b.full_name ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like}
      ORDER BY l.created_at DESC
    `;
  }
  if (status) {
    return sql`
      SELECT l.*, b.full_name, b.phone,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
        (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count
      FROM loans l JOIN borrowers b ON b.id = l.borrower_id
      WHERE l.status = ${status}
      ORDER BY l.created_at DESC
    `;
  }
  return sql`
    SELECT l.*, b.full_name, b.phone,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status = 'paid') AS paid_count,
      (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id) AS total_count
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id
    ORDER BY l.created_at DESC
  `;
}

export async function getLoan(id: number) {
  const [loan] = await sql`
    SELECT l.*, b.full_name, b.phone, b.borrower_code, b.id AS borrower_id
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id WHERE l.id = ${id}
  `;
  if (!loan) return null;
  const installments = await sql`SELECT * FROM loan_installments WHERE loan_id = ${id} ORDER BY installment_no ASC`;
  const payments = await sql`SELECT * FROM collections WHERE loan_id = ${id} ORDER BY payment_date DESC`;
  return { loan, installments, payments };
}

export async function getActiveLoansWithBalance(search?: string) {
  const like = search ? `%${search}%` : null;
  const rows = like
    ? await sql`
        SELECT l.id, l.loan_code, l.status, b.full_name, b.phone,
          (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS due_count,
          (SELECT COALESCE(SUM(li.amount - li.paid_amount),0) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS balance,
          (SELECT MIN(li.due_date) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS next_due
        FROM loans l JOIN borrowers b ON b.id = l.borrower_id
        WHERE l.status = 'active' AND (b.full_name ILIKE ${like} OR l.loan_code ILIKE ${like} OR b.phone ILIKE ${like})
      `
    : await sql`
        SELECT l.id, l.loan_code, l.status, b.full_name, b.phone,
          (SELECT COUNT(*)::int FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS due_count,
          (SELECT COALESCE(SUM(li.amount - li.paid_amount),0) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS balance,
          (SELECT MIN(li.due_date) FROM loan_installments li WHERE li.loan_id = l.id AND li.status IN ('pending','overdue','partial')) AS next_due
        FROM loans l JOIN borrowers b ON b.id = l.borrower_id
        WHERE l.status = 'active'
      `;
  return (rows as any[]).filter((r) => r.due_count > 0).sort((a, b) => (a.next_due > b.next_due ? 1 : -1));
}

export async function getRecentPayments() {
  return sql`
    SELECT c.*, b.full_name, l.loan_code FROM collections c
    JOIN borrowers b ON b.id = c.borrower_id JOIN loans l ON l.id = c.loan_id
    ORDER BY c.created_at DESC LIMIT 10
  `;
}

export async function getCollectionInstallments(loanId: number) {
  return sql`SELECT * FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid' ORDER BY installment_no ASC`;
}

export async function getLoanForCollection(loanId: number) {
  const [loan] = await sql`
    SELECT l.id, l.loan_code, l.status, b.full_name, b.phone, b.id AS borrower_id
    FROM loans l JOIN borrowers b ON b.id = l.borrower_id WHERE l.id = ${loanId}
  `;
  if (!loan) return null;
  const installments = await sql`
    SELECT * FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid' ORDER BY installment_no ASC
  `;
  return { loan, installments };
}

/**
 * Every borrower's credit/debt summary. Only loans that were actually disbursed
 * (active, completed, defaulted) count toward "borrowed" — 'approved' hasn't been
 * disbursed yet, and 'defaulted' must still count as debt (this mirrors a real bug
 * that was found and fixed in the original PHP version's report logic).
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
        WHERE b.full_name ILIKE ${like} OR b.borrower_code ILIKE ${like} OR b.phone ILIKE ${like}
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
        ORDER BY b.full_name ASC
      `;

  return (rows as any[]).map((r) => {
    const outstanding = Math.max(0, Number(r.total_payable) - Number(r.total_paid));
    const creditStatus = r.overdue_count > 0 ? 'Overdue' : outstanding > 0 ? 'Active Debt' : 'Clear';
    return { ...r, outstanding_balance: outstanding, credit_status: creditStatus };
  });
}
