-- Beta auth: users extended, invite_codes, email_verification_codes
-- Run after 001_add_password_hash.sql (users exists)

-- Users: add columns for beta auth (invite code, referral, email verification, profile)
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sex VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_remaining INT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users (nickname) WHERE nickname IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code ON users (invite_code) WHERE invite_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referrer ON users (referrer_user_id) WHERE referrer_user_id IS NOT NULL;

-- Invite codes: seed codes and per-user codes (one row per code)
CREATE TABLE IF NOT EXISTS invite_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_by_user_id BIGINT REFERENCES users (id) ON DELETE CASCADE,
    is_seed BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes (code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes (created_by_user_id) WHERE created_by_user_id IS NOT NULL;

-- Email verification codes (6-digit, 10min expiry, 5 attempts)
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON email_verification_codes (email);
