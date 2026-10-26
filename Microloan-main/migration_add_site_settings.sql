-- =====================================================
-- Migration: Add Website Settings (used by the public homepage
-- and the admin "Website Settings" page).
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds a new single-row table.
-- =====================================================

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    site_name VARCHAR(150) NOT NULL DEFAULT 'MicroLoan',
    tagline VARCHAR(255),
    banner_heading VARCHAR(255),
    banner_subtext TEXT,
    about_text TEXT,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(150),
    contact_address TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO site_settings (id, site_name, tagline, banner_heading, banner_subtext, about_text, contact_phone, contact_email, contact_address)
VALUES (
    1, 'MicroLoan', 'Fast, Fair, and Flexible Micro Loans',
    'Grow Your Business With MicroLoan',
    'Quick approval, flexible repayment plans, and a team that understands what small businesses need.',
    'We provide accessible micro loans to help local entrepreneurs and families cover business needs, emergencies, and everyday opportunities — with clear terms and no hidden fees.',
    '+880 1XXX-XXXXXX', 'info@example.com', 'Chattogram, Bangladesh'
)
ON CONFLICT (id) DO NOTHING;
