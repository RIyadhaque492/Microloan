-- =====================================================
-- Migration: track which installment each payment started from
-- Needed to support safely editing a past payment (see the "Edit"
-- option on Loan Collection) — without this, editing a payment's
-- amount can't be replayed accurately against the installment schedule.
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds a new, nullable column.
-- =====================================================

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS installment_id INTEGER REFERENCES loan_installments(id) ON DELETE SET NULL;

-- Note: payments recorded before this migration will have installment_id = NULL.
-- Editing one of those older payments still works — it just replays using the
-- default oldest-unpaid-installment-first order rather than the exact original
-- starting point (which wasn't being tracked yet).
