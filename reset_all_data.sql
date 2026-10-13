-- DANGER: deletes ALL members, loans, payments, receipts, savings, documents and notifications.
-- Keeps: admin logins and Website Settings (logo, header/footer, homepage). Numbers restart (R0001, S0001...).
-- Take a Neon backup/branch first. This cannot be undone.
TRUNCATE TABLE
  savings_transactions,
  borrower_documents,
  notifications,
  collections,
  loan_installments,
  loans,
  borrowers
RESTART IDENTITY CASCADE;
