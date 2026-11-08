-- Adds soft-delete support ("Bin") for members and loans so both can be
-- removed from normal views and restored later instead of being destroyed.
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_borrowers_deleted_at ON borrowers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_loans_deleted_at ON loans(deleted_at);
