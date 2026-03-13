## Database migrations (PostgreSQL)

This repo uses plain SQL migrations under `apps/api/db/migrations/`.

### When to run migrations

- **New DB**: run `apps/api/db/schema.sql` once to create tables.
- **Existing DB**: apply migrations in order.

### How to run

From your terminal, with `DATABASE_URL` set:

```bash
psql "$DATABASE_URL" -f apps/api/db/migrations/<migration>.sql
```

### Pinned looks migration (slot-based pins)

The app currently expects `pinned_looks` to be **slot-based** (4 fixed slots per user):

- Columns: `user_id`, `slot` (0..3), `saved_look_id`, `created_at`
- Constraints: `(user_id, slot)` is the primary key; `(user_id, saved_look_id)` is unique

#### Apply (create or upgrade)

This migration is safe to re-run and handles:

- No `pinned_looks` table → creates it
- Legacy `pinned_looks` (no `slot`) → migrates into slots 0..3 (oldest-first) and swaps tables
- Already upgraded → no-op (ensures index exists)

```bash
psql "$DATABASE_URL" -f apps/api/db/migrations/002_pinned_looks_create_or_upgrade.sql
```

#### Rollback (back to legacy)

If you need to roll back code that expects legacy schema, run:

```bash
psql "$DATABASE_URL" -f apps/api/db/migrations/002_pinned_looks_rollback_to_legacy.sql
```

#### Notes / safety

- During upgrade from legacy → slot-based:
  - If a user had more than 4 pinned looks, only the first 4 (by `created_at ASC`) are kept.
  - This avoids breaking the “4 fixed slots” UX contract.

