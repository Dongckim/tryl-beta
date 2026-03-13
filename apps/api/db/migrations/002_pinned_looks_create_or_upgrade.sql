-- Pinned looks migration (create or upgrade to slot-based table).
--
-- Supports:
-- - Fresh DB (no pinned_looks): creates slot-based pinned_looks
-- - Old DB (pinned_looks without slot): migrates data into slots 0..3 (oldest first)
-- - Already-upgraded DB: no-op
--
-- Notes:
-- - If more than 4 pins existed in old schema, only the first 4 (by created_at ASC) are kept.
-- - This migration is written to be safe to re-run.

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
    -- Fresh install: create slot-based pinned_looks
    EXECUTE $sql$
      CREATE TABLE pinned_looks (
        user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        slot SMALLINT NOT NULL,
        saved_look_id BIGINT NOT NULL REFERENCES saved_looks (id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, slot),
        UNIQUE (user_id, saved_look_id),
        CONSTRAINT chk_pinned_looks_slot CHECK (slot IN (0, 1, 2, 3))
      );
      CREATE INDEX idx_pinned_looks_user_id ON pinned_looks (user_id, slot);
    $sql$;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pinned_looks' AND column_name = 'slot'
  ) INTO has_slot;

  IF has_slot THEN
    -- Already upgraded; ensure index/constraint exist.
    -- (Constraint name might differ; we only ensure index exists.)
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pinned_looks_user_id ON pinned_looks (user_id, slot)';
    RETURN;
  END IF;

  -- Old schema detected: pinned_looks(user_id, saved_look_id, created_at, ...).
  -- Migrate into new slot-based table.
  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS pinned_looks__new (
      user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      slot SMALLINT NOT NULL,
      saved_look_id BIGINT NOT NULL REFERENCES saved_looks (id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, slot),
      UNIQUE (user_id, saved_look_id),
      CONSTRAINT chk_pinned_looks__new_slot CHECK (slot IN (0, 1, 2, 3))
    );
  $sql$;

  -- Fill slots 0..3 per user, oldest pin first.
  EXECUTE $sql$
    WITH ranked AS (
      SELECT
        user_id,
        saved_look_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, saved_look_id ASC) - 1 AS slot
      FROM pinned_looks
    )
    INSERT INTO pinned_looks__new (user_id, slot, saved_look_id, created_at)
    SELECT user_id, slot, saved_look_id, created_at
    FROM ranked
    WHERE slot BETWEEN 0 AND 3
    ON CONFLICT (user_id, slot) DO NOTHING;
  $sql$;

  -- Swap tables.
  EXECUTE 'DROP TABLE pinned_looks';
  EXECUTE 'ALTER TABLE pinned_looks__new RENAME TO pinned_looks';
  EXECUTE 'ALTER INDEX IF EXISTS pinned_looks__new_pkey RENAME TO pinned_looks_pkey';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_pinned_looks_user_id ON pinned_looks (user_id, slot)';
END $$;

