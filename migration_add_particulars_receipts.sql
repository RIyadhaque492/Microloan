-- =====================================================
-- Migration: Particulars on installments, receipt numbers
-- for savings and member fees, draft-loan support.
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds new columns.
-- =====================================================

ALTER TABLE loan_installments ADD COLUMN IF NOT EXISTS particulars VARCHAR(150);

ALTER TABLE savings_transactions ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(20) UNIQUE;

ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS fee_receipt_no VARCHAR(20);
