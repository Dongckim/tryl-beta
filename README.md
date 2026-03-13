# Tryl — AI Fashion Try-On MVP

Monorepo for an AI fashion try-on product.

## Structure

| Path | Purpose |
|------|---------|
| **apps/web** | Web app — user auth, fitting profiles, archive. Source of truth for identity and profile data. |
| **apps/extension** | Chrome extension — detects products on shopping pages (e.g. Zara), triggers try-on jobs. |
| **apps/api** | FastAPI backend — profiles, product resolution, try-on jobs, archive APIs. |
| **apps/worker** | Python worker — processes async try-on jobs (queued → processing → completed/failed). |
| **packages/shared-types** | Shared TypeScript types for web and extension. |
| **packages/config** | Shared config (ESLint, TypeScript, etc.) for JS/TS packages. |
| **docs** | Project documentation. |

## Quick Start

```bash
pnpm install
pnpm web          # dev: web app
pnpm extension    # dev: extension
pnpm build:web
pnpm build:extension
```

Python apps:

```bash
cd apps/api && pip install -r requirements.txt
cd apps/worker && pip install -r requirements.txt
```

## Run (full stack)

1. **PostgreSQL**: Create DB and run `apps/api/db/schema.sql`
2. **Redis**: `redis-server` (or Docker: `docker run -p 6379:6379 redis`)
3. **API**: `cd apps/api && uvicorn app.main:app --reload --port 8001`
4. **Worker**: `cd apps/worker && python main.py`
5. **Web**: `pnpm web`
6. **Extension**: `pnpm extension` (build and load in Chrome)

Set `REDIS_URL` for API and Worker so try-on jobs are enqueued and processed.
