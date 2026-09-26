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
  interestRate: number;
  installmentAmount: number;
  installments: InstallmentPlan[];
};

function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeDueDate(start: Date, i: number, frequency: 'daily' | 'weekly' | 'monthly'): Date {
  const due = new Date(start);
  if (frequency === 'daily') due.setUTCDate(due.getUTCDate() + i);
  else if (frequency === 'weekly') due.setUTCDate(due.getUTCDate() + i * 7);
  else due.setUTCMonth(due.getUTCMonth() + i);
  return due;
}

/**
 * Builds an installment schedule from the amount the admin actually wants to
 * collect each installment — not the other way around. The interest rate is
 * DERIVED from principal, installment amount, and tenure, rather than being
 * an input: total payable = installmentAmount x tenure, interest = total -
 * principal, rate = interest / principal x 100 (flat — applied once to the
 * whole loan, not prorated by time).
 */
export function generateScheduleFromInstallment(
  principal: number,
  installmentAmount: number,
  tenure: number,
  frequency: 'daily' | 'weekly' | 'monthly',
  startDateStr: string
): ScheduleResult {
  const count = Math.trunc(Number(tenure));
  const perInstallment = Math.round(Number(installmentAmount) * 100) / 100;
  const totalPayable = Math.round(perInstallment * count * 100) / 100;
  const interestAmount = totalPayable - principal;
  const interestRate = principal > 0 ? Math.round((interestAmount / principal) * 100 * 1000) / 1000 : 0;

  const start = new Date(startDateStr + 'T00:00:00Z');
  const installments: InstallmentPlan[] = [];
  for (let i = 1; i <= count; i++) {
    const due = computeDueDate(start, i, frequency);
    installments.push({ installmentNo: i, dueDate: toDateOnlyString(due), amount: perInstallment });
  }

  return { totalPayable, interestRate, installmentAmount: perInstallment, installments };
}

/** loanRows here are per-LOAN rows for a single member (see getLoanReportRows) —
 *  a member with two disbursed loans gets two lines. */
export function buildSingleUserShareText(member: { full_name: string; borrower_code: string; phone: string }, loanRows: any[]): string {
  const lines = [
    `*MicroLoan Credit Report*`,
    `Member: ${member.full_name} (${member.borrower_code})`,
    `Phone: ${member.phone}`,
    '',
  ];
  if (loanRows.length === 0) {
    lines.push('No disbursed loans.');
  } else {
    const totalLoan = loanRows.reduce((s, r) => s + Number(r.loan_amount), 0);
    const totalPayable = loanRows.reduce((s, r) => s + Number(r.total_payable), 0);
    const totalPaid = loanRows.reduce((s, r) => s + Number(r.total_paid), 0);
    const totalRemaining = loanRows.reduce((s, r) => s + Number(r.remaining_balance), 0);
    lines.push('Loans:');
    for (const r of loanRows) {
      lines.push(
        `- ${r.loan_code}: Loan ৳${money(r.loan_amount)}, Payable ৳${money(r.total_payable)}, Paid ৳${money(r.total_paid)}, Remaining ৳${money(r.remaining_balance)}, Maturity ${r.maturity_date ? new Date(r.maturity_date).toLocaleDateString() : '—'}`
      );
    }
    lines.push(
      '',
      `TOTAL Loan Amount: ৳${money(totalLoan)}`,
      `TOTAL Payable: ৳${money(totalPayable)}`,
      `TOTAL Paid: ৳${money(totalPaid)}`,
      `TOTAL Remaining: ৳${money(totalRemaining)}`
    );
  }
  lines.push('', `Generated: ${new Date().toLocaleString()}`);
  return lines.join('\n');
}

/** rows here are per-LOAN rows across all members (see getLoanReportRows). */
export function buildAllUsersShareText(rows: any[]): string {
  const totalLoan = rows.reduce((s, r) => s + Number(r.loan_amount), 0);
  const totalPayable = rows.reduce((s, r) => s + Number(r.total_payable), 0);
  const totalPaid = rows.reduce((s, r) => s + Number(r.total_paid), 0);
  const totalRemaining = rows.reduce((s, r) => s + Number(r.remaining_balance), 0);

  const lines = [`*MicroLoan - All Loans Summary*`, `Generated: ${new Date().toLocaleString()}`, ''];
  rows.forEach((r, i) => {
    lines.push(
      `${i + 1}. ${r.full_name} (${r.borrower_code}) — ${r.loan_code}: Loan ৳${money(r.loan_amount)}, Payable ৳${money(r.total_payable)}, Paid ৳${money(r.total_paid)}, Remaining ৳${money(r.remaining_balance)}`
    );
  });
  lines.push(
    '',
    `TOTAL Loan Amount: ৳${money(totalLoan)}`,
    `TOTAL Payable: ৳${money(totalPayable)}`,
    `TOTAL Paid: ৳${money(totalPaid)}`,
    `TOTAL Remaining: ৳${money(totalRemaining)}`
  );
  return lines.join('\n');
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-purple-100 text-purple-700',
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
    deposit: 'bg-green-100 text-green-700',
    withdrawal: 'bg-amber-100 text-amber-700',
  };
  return map[status] || 'bg-gray-200 text-gray-700';
}
