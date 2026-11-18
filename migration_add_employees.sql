-- Update 49: Employees (Office Information), appointment address, company registration number
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_reg_no VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE appointment_letters ADD COLUMN IF NOT EXISTS address VARCHAR(300) NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL DEFAULT '',
    full_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    email VARCHAR(150) NOT NULL DEFAULT '',
    nid_no VARCHAR(50) NOT NULL DEFAULT '',
    date_of_birth DATE,
    gender VARCHAR(20) NOT NULL DEFAULT '',
    marital_status VARCHAR(30) NOT NULL DEFAULT '',
    religion VARCHAR(50) NOT NULL DEFAULT '',
    nationality VARCHAR(50) NOT NULL DEFAULT '',
    blood_group VARCHAR(10) NOT NULL DEFAULT '',
    father_name VARCHAR(150) NOT NULL DEFAULT '',
    mother_name VARCHAR(150) NOT NULL DEFAULT '',
    spouse_name VARCHAR(150) NOT NULL DEFAULT '',
    qualification VARCHAR(200) NOT NULL DEFAULT '',
    present_address VARCHAR(300) NOT NULL DEFAULT '',
    permanent_address VARCHAR(300) NOT NULL DEFAULT '',
    joining_date DATE,
    salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    emergency_name VARCHAR(150) NOT NULL DEFAULT '',
    emergency_phone VARCHAR(50) NOT NULL DEFAULT '',
    emergency_relation VARCHAR(50) NOT NULL DEFAULT '',
    bank_account VARCHAR(100) NOT NULL DEFAULT '',
    other_info TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
