-- Report / Receipt header & footer settings. Run once in the Neon SQL Editor.
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_header_text VARCHAR(200);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_logo_data TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_logo_mime VARCHAR(100);
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_footer_address TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS doc_footer_contact TEXT;
