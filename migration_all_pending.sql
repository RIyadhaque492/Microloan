-- Run this ONCE in the Neon SQL Editor. Safe to run again. Adds everything the newer app versions need.
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_header_text VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_logo_data TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_logo_mime VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_footer_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_footer_contact TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_footer_email TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_style TEXT;

CREATE TABLE IF NOT EXISTS borrower_photos (
    borrower_id INTEGER PRIMARY KEY REFERENCES borrowers(id) ON DELETE CASCADE,
    mime_type VARCHAR(100) NOT NULL,
    photo_data TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Temporary share links for PDF / Excel / Word files (Telegram, Messenger, WhatsApp, Email)
CREATE TABLE IF NOT EXISTS shared_files (
    token VARCHAR(64) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_relationship VARCHAR(100);

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

-- Update 44: extra member details (all optional)
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS mother_name VARCHAR(150);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS marital_status VARCHAR(30);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS religion VARCHAR(50);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS nationality VARCHAR(60);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS qualification VARCHAR(120);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS other_info TEXT;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_nid VARCHAR(50);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_occupation VARCHAR(100);
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_address TEXT;
