-- Wipe all users and auth-related data for re-testing.
-- Keeps: products. Removes: users, invite_codes, email_verification_codes,
--        user_profiles, fitting_profile_versions, tryon_jobs, tryon_results,
--        saved_looks, pinned_looks.
-- Run: psql $DATABASE_URL -f apps/api/db/scripts/truncate_users.sql

TRUNCATE email_verification_codes;
TRUNCATE users CASCADE;
