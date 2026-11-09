-- Cash Book (Accounts): manual cash in / cash out entries.
-- Loan collections, disbursements, savings and fees are read automatically from existing tables.
CREATE TABLE IF NOT EXISTS cash_entries (
    id SERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    direction VARCHAR(3) NOT NULL,
    category VARCHAR(60) NOT NULL,
    description VARCHAR(255) NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cash_entries_date ON cash_entries(entry_date);
