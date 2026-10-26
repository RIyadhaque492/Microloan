-- =====================================================
-- Migration: Add borrower & guarantor document uploads
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds a new table.
-- =====================================================

CREATE TABLE IF NOT EXISTS borrower_documents (
    id SERIAL PRIMARY KEY,
    borrower_id INTEGER NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    doc_title VARCHAR(150) NOT NULL,
    doc_type VARCHAR(30) NOT NULL DEFAULT 'other',
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_data TEXT NOT NULL,
    uploaded_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_borrower ON borrower_documents(borrower_id);
