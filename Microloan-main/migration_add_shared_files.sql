-- Run once in the Neon SQL Editor (also included in migration_all_pending.sql).
-- Temporary share links for PDF / Excel / Word files (Telegram, Messenger, WhatsApp, Email)
CREATE TABLE IF NOT EXISTS shared_files (
    token VARCHAR(64) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
