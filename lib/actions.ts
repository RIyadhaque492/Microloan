'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql } from './db';
import { createSession, destroySession, getSession } from './auth';
import { generateCode, generateSchedule } from './utils';

async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect('/login');
  return session!;
}

// ---------- Auth ----------

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  const [admin] = await sql`SELECT * FROM admins WHERE email = ${email} LIMIT 1`;
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return { error: 'Invalid email or password.' };
  }
  if (admin.status !== 'active') {
    return { error: 'Your account has been deactivated.' };
  }

  await createSession({ adminId: admin.id, name: admin.full_name, email: admin.email, role: admin.role });
  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

// ---------- Borrowers ----------

export async function createBorrowerAction(formData: FormData) {
  const admin = await requireAdmin();
  const code = generateCode('BOR');

  const fullName = String(formData.get('full_name') || '').trim();
  const phone = String(formData.get('phone') || '').trim();
  if (!fullName || !phone) {
    redirect('/borrowers/new?error=' + encodeURIComponent('Full name and phone are required.'));
  }

  const [row] = await sql`
    INSERT INTO borrowers
      (borrower_code, full_name, father_name, gender, phone, email, nid_number, present_address, occupation, monthly_income, guarantor_name, guarantor_phone, status, created_by)
    VALUES (
      ${code}, ${fullName}, ${String(formData.get('father_name') || '')}, ${String(formData.get('gender') || 'male')},
      ${phone}, ${String(formData.get('email') || '')}, ${String(formData.get('nid_number') || '')},
      ${String(formData.get('present_address') || '')}, ${String(formData.get('occupation') || '')},
      ${Number(formData.get('monthly_income') || 0)}, ${String(formData.get('guarantor_name') || '')},
      ${String(formData.get('guarantor_phone') || '')}, 'active', ${admin.adminId}
    )
    RETURNING id
  `;

  revalidatePath('/borrowers');
  redirect(`/borrowers/${row.id}`);
}

export async function updateBorrowerAction(id: number, formData: FormData) {
  await requireAdmin();

  await sql`
    UPDATE borrowers SET
      full_name = ${String(formData.get('full_name') || '')},
      father_name = ${String(formData.get('father_name') || '')},
      gender = ${String(formData.get('gender') || 'male')},
      phone = ${String(formData.get('phone') || '')},
      email = ${String(formData.get('email') || '')},
      nid_number = ${String(formData.get('nid_number') || '')},
      present_address = ${String(formData.get('present_address') || '')},
      occupation = ${String(formData.get('occupation') || '')},
      monthly_income = ${Number(formData.get('monthly_income') || 0)},
      guarantor_name = ${String(formData.get('guarantor_name') || '')},
      guarantor_phone = ${String(formData.get('guarantor_phone') || '')},
      status = ${String(formData.get('status') || 'active')}
    WHERE id = ${id}
  `;

  revalidatePath('/borrowers');
  revalidatePath(`/borrowers/${id}`);
  redirect(`/borrowers/${id}`);
}

export async function deleteBorrowerAction(id: number) {
  await requireAdmin();
  const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM loans WHERE borrower_id = ${id}`;
  if (c > 0) {
    redirect('/borrowers?error=' + encodeURIComponent('Cannot delete a borrower with existing loans. Deactivate them instead.'));
  }
  await sql`DELETE FROM borrowers WHERE id = ${id}`;
  revalidatePath('/borrowers');
  redirect('/borrowers');
}

// ---------- Loans ----------

export async function createLoanAction(formData: FormData) {
  const admin = await requireAdmin();

  const borrowerId = Number(formData.get('borrower_id'));
  const amount = Number(formData.get('loan_amount'));
  const rate = Number(formData.get('interest_rate'));
  const interestType = String(formData.get('interest_type') || 'flat');
  const tenure = Number(formData.get('tenure'));
  const frequency = String(formData.get('repayment_frequency') || 'monthly') as 'daily' | 'weekly' | 'monthly';
  const purpose = String(formData.get('purpose') || '');
  const disbursed = String(formData.get('disbursement_date') || new Date().toISOString().slice(0, 10));

  if (!borrowerId || amount <= 0 || tenure <= 0) {
    redirect('/loans/new?error=' + encodeURIComponent('Please fill in all required loan fields correctly.'));
  }

  const schedule = generateSchedule(amount, rate, tenure, frequency, disbursed);
  const code = generateCode('LN');

  const [loan] = await sql`
    INSERT INTO loans
      (loan_code, borrower_id, loan_amount, interest_rate, interest_type, tenure, repayment_frequency, total_payable, installment_amount, purpose, disbursement_date, status, created_by)
    VALUES (
      ${code}, ${borrowerId}, ${amount}, ${rate}, ${interestType}, ${tenure}, ${frequency},
      ${schedule.totalPayable}, ${schedule.installmentAmount}, ${purpose}, ${disbursed}, 'pending', ${admin.adminId}
    )
    RETURNING id
  `;

  for (const inst of schedule.installments) {
    await sql`
      INSERT INTO loan_installments (loan_id, installment_no, due_date, amount)
      VALUES (${loan.id}, ${inst.installmentNo}, ${inst.dueDate}, ${inst.amount})
    `;
  }

  revalidatePath('/loans');
  redirect(`/loans/${loan.id}`);
}

const LOAN_STATUS_MAP: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  activate: 'active',
  complete: 'completed',
  default: 'defaulted',
};

export async function updateLoanStatusAction(id: number, action: string): Promise<void> {
  const admin = await requireAdmin();
  const newStatus = LOAN_STATUS_MAP[action];
  if (!newStatus) return;

  await sql`UPDATE loans SET status = ${newStatus}, approved_by = ${admin.adminId} WHERE id = ${id}`;
  revalidatePath(`/loans/${id}`);
  revalidatePath('/loans');
}

export async function deleteLoanAction(id: number) {
  await requireAdmin();
  const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM collections WHERE loan_id = ${id}`;
  if (c > 0) {
    redirect('/loans?error=' + encodeURIComponent('Cannot delete a loan with recorded payments.'));
  }
  await sql`DELETE FROM loans WHERE id = ${id}`;
  revalidatePath('/loans');
  redirect('/loans');
}

// ---------- Collections ----------

export async function collectPaymentAction(formData: FormData) {
  const admin = await requireAdmin();

  const loanId = Number(formData.get('loan_id'));
  const startInstallmentId = Number(formData.get('installment_id') || 0);
  const amount = Number(formData.get('amount_paid'));
  const method = String(formData.get('payment_method') || 'cash');
  const paymentDate = String(formData.get('payment_date') || new Date().toISOString().slice(0, 10));
  const notes = String(formData.get('notes') || '');

  if (!loanId || amount <= 0) {
    redirect(`/collections/${loanId}?error=` + encodeURIComponent('Payment amount must be greater than zero.'));
  }

  const [loan] = await sql`SELECT * FROM loans WHERE id = ${loanId}`;
  if (!loan) redirect('/collections?error=' + encodeURIComponent('Loan not found.'));

  const installments = (await sql`
    SELECT * FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid' ORDER BY installment_no ASC
  `) as any[];

  // Reorder so the chosen starting installment (if any) is applied first, then the rest in order.
  const ordered = startInstallmentId
    ? [...installments.filter((i) => i.id === startInstallmentId), ...installments.filter((i) => i.id !== startInstallmentId)]
    : installments;

  let remaining = amount;
  for (const inst of ordered) {
    if (remaining <= 0) break;
    const due = Number(inst.amount) - Number(inst.paid_amount);
    const payNow = Math.min(remaining, due);
    if (payNow <= 0) continue;

    const newPaid = Number(inst.paid_amount) + payNow;
    const newStatus = newPaid >= Number(inst.amount) ? 'paid' : 'partial';
    const paidDate = newStatus === 'paid' ? paymentDate : null;

    await sql`
      UPDATE loan_installments SET paid_amount = ${newPaid}, status = ${newStatus}, paid_date = ${paidDate}
      WHERE id = ${inst.id}
    `;

    remaining -= payNow;
  }

  const applied = Math.round((amount - Math.max(remaining, 0)) * 100) / 100;
  const receiptNo = generateCode('RCPT');

  const [collection] = await sql`
    INSERT INTO collections (receipt_no, loan_id, borrower_id, amount_paid, payment_method, payment_date, notes, collected_by)
    VALUES (${receiptNo}, ${loanId}, ${loan.borrower_id}, ${applied}, ${method}, ${paymentDate}, ${notes}, ${admin.adminId})
    RETURNING id
  `;

  const [{ c: remainingUnpaid }] = await sql`
    SELECT COUNT(*)::int AS c FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid'
  `;
  if (remainingUnpaid === 0) {
    await sql`UPDATE loans SET status = 'completed' WHERE id = ${loanId}`;
  }

  await sql`
    INSERT INTO notifications (loan_id, borrower_id, title, message, type)
    VALUES (${loanId}, ${loan.borrower_id}, 'Payment received', ${`Received ${applied.toFixed(2)} for loan ${loan.loan_code}.`}, 'payment_received')
  `;

  revalidatePath('/collections');
  revalidatePath(`/loans/${loanId}`);
  redirect(`/collections/receipt/${collection.id}`);
}

// ---------- Notifications ----------

export async function markNotificationReadAction(id: number) {
  await requireAdmin();
  await sql`UPDATE notifications SET is_read = true WHERE id = ${id}`;
  revalidatePath('/notifications');
}

export async function markAllNotificationsReadAction() {
  await requireAdmin();
  await sql`UPDATE notifications SET is_read = true`;
  revalidatePath('/notifications');
}
