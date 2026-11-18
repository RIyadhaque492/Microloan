-- Appointment letters (Office Information)
CREATE TABLE IF NOT EXISTS appointment_letters (
    id SERIAL PRIMARY KEY,
    letter_date DATE,
    employee_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    contact VARCHAR(100) NOT NULL DEFAULT '',
    effective_date DATE,
    salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    organization VARCHAR(200) NOT NULL DEFAULT '',
    responsibilities TEXT NOT NULL DEFAULT '',
    rules TEXT NOT NULL DEFAULT '',
    signatory_name VARCHAR(150) NOT NULL DEFAULT '',
    signatory_title VARCHAR(100) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
