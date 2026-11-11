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
