-- Rollback pinned_looks slot-based table to legacy shape.
--
-- WARNING:
-- - This DROPS the slot column/constraints and recreates the legacy table.
-- - Any pins beyond 4 per user (not possible in slot table) are unaffected.
-- - This is intended only if you need to roll back application code expecting legacy schema.

DO $$
DECLARE
  has_table boolean;
  has_slot boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pinned_looks'
  ) INTO has_table;

  IF NOT has_table THEN
    RAISE NOTICE 'pinned_looks does not exist; nothing to rollback';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pinned_looks' AND column_name = 'slot'
  ) INTO has_slot;

  IF NOT has_slot THEN
    RAISE NOTICE 'pinned_looks is already legacy; nothing to rollback';
    RETURN;
  END IF;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS pinned_looks__legacy (
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      saved_look_id BIGINT NOT NULL REFERENCES saved_looks (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, saved_look_id)
    );
  $sql$;

  EXECUTE $sql$
    INSERT INTO pinned_looks__legacy (user_id, saved_look_id, created_at)
    SELECT user_id, saved_look_id, created_at
    FROM pinned_looks
    ON CONFLICT (user_id, saved_look_id) DO NOTHING;
  $sql$;

  EXECUTE 'DROP TABLE pinned_looks';
  EXECUTE 'ALTER TABLE pinned_looks__legacy RENAME TO pinned_looks';
END $$;

