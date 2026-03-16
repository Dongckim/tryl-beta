-- 1 = front (1st photo), 2 = side (2nd photo). Default 1 for existing rows.
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS profile_photo_index SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE tryon_jobs ADD CONSTRAINT chk_tryon_jobs_profile_photo_index CHECK (profile_photo_index IN (1, 2));
