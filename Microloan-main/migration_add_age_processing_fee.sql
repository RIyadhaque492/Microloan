-- Adds member age and loan processing fee. Run once in the Neon SQL Editor.
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS processing_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
