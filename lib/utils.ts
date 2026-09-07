export function money(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateCode(prefix: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

export function frequencyShortLabel(freq: string) {
  if (freq === 'daily') return 'days';
  if (freq === 'weekly') return 'wks';
  return 'mo';
}

export function frequencyFullLabel(freq: string) {
  if (freq === 'daily') return 'days';
  if (freq === 'weekly') return 'weeks';
  return 'months';
}

export type InstallmentPlan = {
  installmentNo: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
};

export type ScheduleResult = {
  totalPayable: number;
  installmentAmount: number;
  installments: InstallmentPlan[];
};

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a flat-interest installment schedule.
 * Mirrors the original PHP generate_installments() logic 1:1, including the
 * fix for the last-installment rounding-remainder bug (tenure is coerced to
 * a real number up front so the "last installment" check is always reliable).
 */
export function generateSchedule(
  principal: number,
  ratePercent: number,
  tenure: number,
  frequency: 'daily' | 'weekly' | 'monthly',
  startDateStr: string
): ScheduleResult {
  const count = Math.trunc(Number(tenure));

  let yearFraction: number;
  if (frequency === 'daily') yearFraction = count / 365;
  else if (frequency === 'weekly') yearFraction = count / 52;
  else yearFraction = count / 12;

  const interestAmount = principal * (ratePercent / 100) * yearFraction;
  const totalPayable = Math.round((principal + interestAmount) * 100) / 100;
  const installmentAmount = Math.round((totalPayable / count) * 100) / 100;

  const start = new Date(startDateStr + 'T00:00:00Z');
  const installments: InstallmentPlan[] = [];
  let runningTotal = 0;

  for (let i = 1; i <= count; i++) {
    const due = new Date(start);
    if (frequency === 'daily') {
      due.setUTCDate(due.getUTCDate() + i);
    } else if (frequency === 'weekly') {
      due.setUTCDate(due.getUTCDate() + i * 7);
    } else {
      due.setUTCMonth(due.getUTCMonth() + i);
    }

    const amt = i === count ? Math.round((totalPayable - runningTotal) * 100) / 100 : installmentAmount;
    runningTotal += amt;

    installments.push({ installmentNo: i, dueDate: toDateOnlyString(due), amount: amt });
  }

  return { totalPayable, installmentAmount, installments };
}

export function buildSingleUserShareText(borrower: any, loans: any[]): string {
  const lines = [
    `*MicroLoan Credit Report*`,
    `Borrower: ${borrower.full_name} (${borrower.borrower_code})`,
    `Phone: ${borrower.phone}`,
    '',
    `Total Borrowed: ৳${money(borrower.total_borrowed)}`,
    `Total Paid: ৳${money(borrower.total_paid)}`,
    `Outstanding: ৳${money(borrower.outstanding_balance)}`,
    `Status: ${borrower.credit_status}`,
  ];
  if (loans.length > 0) {
    lines.push('', 'Loans:');
    for (const l of loans) {
      lines.push(`- ${l.loan_code}: ৳${money(l.loan_amount)} (${l.status})`);
    }
  }
  lines.push('', `Generated: ${new Date().toLocaleString()}`);
  return lines.join('\n');
}

export function buildAllUsersShareText(rows: any[]): string {
  const totalBorrowed = rows.reduce((s, r) => s + Number(r.total_borrowed), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid), 0);
  const totalOutstanding = rows.reduce((s, r) => s + Number(r.outstanding_balance), 0);

  const lines = [`*MicroLoan - All Borrowers Summary*`, `Generated: ${new Date().toLocaleString()}`, ''];
  for (const r of rows) {
    lines.push(`${r.full_name} (${r.borrower_code}): Borrowed ৳${money(r.total_borrowed)}, Paid ৳${money(r.total_paid)}, Due ৳${money(r.outstanding_balance)} [${r.credit_status}]`);
  }
  lines.push(
    '',
    `TOTAL Borrowed: ৳${money(totalBorrowed)}`,
    `TOTAL Paid: ৳${money(totalPaid)}`,
    `TOTAL Outstanding: ৳${money(totalOutstanding)}`
  );
  return lines.join('\n');
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-200 text-gray-700',
    approved: 'bg-sky-100 text-sky-700',
    active: 'bg-teal-100 text-teal-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    defaulted: 'bg-gray-800 text-white',
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    inactive: 'bg-gray-200 text-gray-700',
    blacklisted: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-200 text-gray-700';
}
