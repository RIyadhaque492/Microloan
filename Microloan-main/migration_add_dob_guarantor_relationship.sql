-- Adds member date of birth (age is calculated from it) and relationship with guarantor.
-- Run once in the Neon SQL Editor (safe to run again). The app also adds these automatically the first time a member is saved.
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE borrowers ADD COLUMN IF NOT EXISTS guarantor_relationship VARCHAR(100);
