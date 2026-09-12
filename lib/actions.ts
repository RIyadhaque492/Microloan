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
  redirect('/dashboard');
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

/**
 * Applies a payment amount across a loan's unpaid installments, cascading
 * overflow into the next one(s). Shared by collectPaymentAction (new payments)
 * and updateCollectionAction (which replays a loan's whole payment history
 * after an edit, to keep installment states correct).
 */
async function applyPaymentToInstallments(
  loanId: number,
  amount: number,
  startInstallmentId: number | null,
  paymentDate: string
): Promise<{ appliedAmount: number; firstInstallmentId: number | null }> {
  const installments = (await sql`
    SELECT * FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid' ORDER BY installment_no ASC
  `) as any[];

  const ordered = startInstallmentId
    ? [...installments.filter((i) => i.id === startInstallmentId), ...installments.filter((i) => i.id !== startInstallmentId)]
    : installments;

  let remaining = amount;
  let firstInstallmentId: number | null = null;

  for (const inst of ordered) {
    if (remaining <= 0) break;
    const due = Number(inst.amount) - Number(inst.paid_amount);
    const payNow = Math.min(remaining, due);
    if (payNow <= 0) continue;
    if (firstInstallmentId === null) firstInstallmentId = inst.id;

    const newPaid = Number(inst.paid_amount) + payNow;
    const newStatus = newPaid >= Number(inst.amount) ? 'paid' : 'partial';
    const paidDate = newStatus === 'paid' ? paymentDate : null;

    await sql`
      UPDATE loan_installments SET paid_amount = ${newPaid}, status = ${newStatus}, paid_date = ${paidDate}
      WHERE id = ${inst.id}
    `;

    remaining -= payNow;
  }

  return { appliedAmount: Math.round((amount - Math.max(remaining, 0)) * 100) / 100, firstInstallmentId };
}

async function recomputeLoanCompletionStatus(loanId: number) {
  const [{ c: remainingUnpaid }] = await sql`
    SELECT COUNT(*)::int AS c FROM loan_installments WHERE loan_id = ${loanId} AND status != 'paid'
  `;
  const [loanRow] = await sql`SELECT status FROM loans WHERE id = ${loanId}`;
  if (remainingUnpaid === 0 && loanRow.status !== 'completed') {
    await sql`UPDATE loans SET status = 'completed' WHERE id = ${loanId}`;
  } else if (remainingUnpaid > 0 && loanRow.status === 'completed') {
    // Editing a payment down can un-complete a loan — put it back to active.
    await sql`UPDATE loans SET status = 'active' WHERE id = ${loanId}`;
  }
}

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

  const { appliedAmount, firstInstallmentId } = await applyPaymentToInstallments(loanId, amount, startInstallmentId || null, paymentDate);

  const receiptNo = generateCode('RCPT');

  const [collection] = await sql`
    INSERT INTO collections (receipt_no, loan_id, installment_id, borrower_id, amount_paid, payment_method, payment_date, notes, collected_by)
    VALUES (${receiptNo}, ${loanId}, ${firstInstallmentId}, ${loan.borrower_id}, ${appliedAmount}, ${method}, ${paymentDate}, ${notes}, ${admin.adminId})
    RETURNING id
  `;

  await recomputeLoanCompletionStatus(loanId);

  await sql`
    INSERT INTO notifications (loan_id, borrower_id, title, message, type)
    VALUES (${loanId}, ${loan.borrower_id}, 'Payment received', ${`Received ${appliedAmount.toFixed(2)} for loan ${loan.loan_code}.`}, 'payment_received')
  `;

  revalidatePath('/collections');
  revalidatePath(`/loans/${loanId}`);
  redirect(`/collections/receipt/${collection.id}`);
}

export async function updateCollectionAction(id: number, formData: FormData) {
  await requireAdmin();

  const [collection] = await sql`SELECT * FROM collections WHERE id = ${id}`;
  if (!collection) redirect('/collections?error=' + encodeURIComponent('Payment record not found.'));

  const newAmount = Number(formData.get('amount_paid'));
  const newMethod = String(formData.get('payment_method') || 'cash');
  const newDate = String(formData.get('payment_date') || collection.payment_date);
  const newNotes = String(formData.get('notes') || '');

  if (newAmount <= 0) {
    redirect(`/collections/edit/${id}?error=` + encodeURIComponent('Amount must be greater than zero.'));
  }

  const loanId = collection.loan_id;

  await sql`
    UPDATE collections SET amount_paid = ${newAmount}, payment_method = ${newMethod}, payment_date = ${newDate}, notes = ${newNotes}
    WHERE id = ${id}
  `;

  // Rebuild every installment on this loan from scratch, then replay every
  // payment for this loan in date order (using the edited amount for this
  // one) — this is what makes editing a past payment safe and correct,
  // rather than trying to patch the old effect in place.
  await sql`UPDATE loan_installments SET paid_amount = 0, status = 'pending', paid_date = NULL WHERE loan_id = ${loanId}`;

  const allCollections = (await sql`
    SELECT * FROM collections WHERE loan_id = ${loanId} ORDER BY payment_date ASC, id ASC
  `) as any[];

  for (const c of allCollections) {
    await applyPaymentToInstallments(loanId, Number(c.amount_paid), c.installment_id, c.payment_date);
  }

  await sql`UPDATE loan_installments SET status = 'overdue' WHERE status = 'pending' AND due_date < CURRENT_DATE`;
  await recomputeLoanCompletionStatus(loanId);

  revalidatePath('/collections');
  revalidatePath(`/loans/${loanId}`);
  redirect(`/loans/${loanId}`);
}

// ---------- Site Settings ----------

export async function updateSiteSettingsAction(formData: FormData) {
  await requireAdmin();

  await sql`
    UPDATE site_settings SET
      site_name = ${String(formData.get('site_name') || 'MicroLoan')},
      tagline = ${String(formData.get('tagline') || '')},
      banner_heading = ${String(formData.get('banner_heading') || '')},
      banner_subtext = ${String(formData.get('banner_subtext') || '')},
      about_text = ${String(formData.get('about_text') || '')},
      contact_phone = ${String(formData.get('contact_phone') || '')},
      contact_email = ${String(formData.get('contact_email') || '')},
      contact_address = ${String(formData.get('contact_address') || '')},
      updated_at = now()
    WHERE id = 1
  `;

  revalidatePath('/settings');
  revalidatePath('/');
  redirect('/settings?saved=1');
}

// ---------- Documents ----------

const MAX_DOC_SIZE = 3 * 1024 * 1024; // 3MB — stays safely under Vercel's request size limits once base64-encoded
const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export async function uploadDocumentAction(borrowerId: number, formData: FormData) {
  const admin = await requireAdmin();

  const file = formData.get('file') as File | null;
  const docTitle = String(formData.get('doc_title') || '').trim();
  const docType = String(formData.get('doc_type') || 'other');

  if (!file || file.size === 0) {
    redirect(`/borrowers/${borrowerId}?error=` + encodeURIComponent('Please choose a file to upload.'));
  }
  if (!docTitle) {
    redirect(`/borrowers/${borrowerId}?error=` + encodeURIComponent('Please give the document a title.'));
  }
  if (file.size > MAX_DOC_SIZE) {
    redirect(`/borrowers/${borrowerId}?error=` + encodeURIComponent('File is too large. Max size is 3MB — try a smaller photo or a compressed PDF.'));
  }
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    redirect(`/borrowers/${borrowerId}?error=` + encodeURIComponent('Only JPG, PNG, WEBP, or PDF files are allowed.'));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  await sql`
    INSERT INTO borrower_documents (borrower_id, doc_title, doc_type, file_name, mime_type, file_size, file_data, uploaded_by)
    VALUES (${borrowerId}, ${docTitle}, ${docType}, ${file.name}, ${file.type}, ${file.size}, ${base64}, ${admin.adminId})
  `;

  revalidatePath(`/borrowers/${borrowerId}`);
  redirect(`/borrowers/${borrowerId}#documents`);
}

export async function deleteDocumentAction(borrowerId: number, docId: number) {
  await requireAdmin();
  await sql`DELETE FROM borrower_documents WHERE id = ${docId} AND borrower_id = ${borrowerId}`;
  revalidatePath(`/borrowers/${borrowerId}`);
  redirect(`/borrowers/${borrowerId}#documents`);
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
