-- Add retry_count to tryon_jobs for automatic retry support
ALTER TABLE tryon_jobs ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
