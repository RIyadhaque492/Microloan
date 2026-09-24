-- =====================================================
-- Migration: Add homepage banner image upload support.
--
-- Run this in Neon's SQL Editor against your EXISTING database.
-- No data loss — this only adds new columns.
-- =====================================================

ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_image_data TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS banner_image_mime VARCHAR(100);
