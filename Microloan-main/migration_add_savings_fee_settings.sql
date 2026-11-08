-- =====================================================
-- Migration: Savings accounts, member registration fee,
-- and a configurable savings interest rate setting.
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds new columns/tables.
-- =====================================================

ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS registration_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS savings_interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS savings_transactions (
    id SERIAL PRIMARY KEY,
    borrower_id INTEGER NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    notes VARCHAR(255),
    transaction_date DATE NOT NULL,
    recorded_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_borrower ON savings_transactions(borrower_id);
