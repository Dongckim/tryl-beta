-- Replace nickname and name with first_name, last_name
-- Run after 004_auth_beta_invite_email_verification.sql (or on DB that has name/nickname).

-- Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill from existing name only if name column exists (migrating from old schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'name') THEN
    UPDATE users SET first_name = COALESCE(name, ''), last_name = '' WHERE first_name IS NULL;
  END IF;
END $$;

-- Drop nickname index and column
DROP INDEX IF EXISTS idx_users_nickname;
ALTER TABLE users DROP COLUMN IF EXISTS nickname;

-- Drop old name column
ALTER TABLE users DROP COLUMN IF EXISTS name;
