-- Adds an editable Maturity Date to loans (settable at registration, editable
-- from the loan detail page), and used in the loan register reports.
ALTER TABLE loans ADD COLUMN IF NOT EXISTS maturity_date DATE;
