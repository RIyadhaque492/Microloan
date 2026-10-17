-- Member profile pictures. Run once in the Neon SQL Editor.
CREATE TABLE IF NOT EXISTS borrower_photos (
    borrower_id INTEGER PRIMARY KEY REFERENCES borrowers(id) ON DELETE CASCADE,
    mime_type VARCHAR(100) NOT NULL,
    photo_data TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
