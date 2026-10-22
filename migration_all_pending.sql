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
