-- =====================================================
-- MicroLoan Admin — Neon/Postgres schema
-- Run this once against your Neon database (Neon SQL Editor,
-- or `psql $DATABASE_URL -f schema.sql`).
-- =====================================================

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin', -- super_admin, admin, collector
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS borrowers (
    id SERIAL PRIMARY KEY,
    borrower_code VARCHAR(40) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    father_name VARCHAR(150),
    gender VARCHAR(10),
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150),
    nid_number VARCHAR(50),
    present_address TEXT,
    occupation VARCHAR(100),
    monthly_income NUMERIC(12,2) NOT NULL DEFAULT 0,
    guarantor_name VARCHAR(150),
    guarantor_phone VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, blacklisted
    created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_code VARCHAR(40) NOT NULL UNIQUE,
    borrower_id INTEGER NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    loan_amount NUMERIC(12,2) NOT NULL,
    interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
    interest_type VARCHAR(20) NOT NULL DEFAULT 'flat',
    tenure INTEGER NOT NULL,
    repayment_frequency VARCHAR(10) NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly
    total_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
    installment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    purpose VARCHAR(255),
    disbursement_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, active, completed, rejected, defaulted
    approved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loan_installments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_no INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' -- pending, paid, partial, overdue
);

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    receipt_no VARCHAR(40) NOT NULL UNIQUE,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_id INTEGER REFERENCES loan_installments(id) ON DELETE SET NULL,
    borrower_id INTEGER NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
    payment_date DATE NOT NULL,
    notes VARCHAR(255),
    collected_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE,
    borrower_id INTEGER REFERENCES borrowers(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'due_soon', -- due_soon, overdue, payment_received
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_installments_loan ON loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_collections_loan ON collections(loan_id);
CREATE INDEX IF NOT EXISTS idx_collections_borrower ON collections(borrower_id);

-- Default admin login: admin@microloan.com / admin123
-- (bcrypt hash below corresponds to "admin123")
INSERT INTO admins (full_name, email, phone, password, role)
VALUES ('System Administrator', 'admin@microloan.com', '0100000000', '$2a$10$5WK7uDYfQwnu/7upbgtxVueJO14nOl25FY5RyjLnJbR54mF/mqgSi', 'super_admin')
ON CONFLICT (email) DO NOTHING;
