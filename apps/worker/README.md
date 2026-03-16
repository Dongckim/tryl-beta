# Try-on Worker

Async Python worker for try-on job processing. Consumes job IDs from a Redis queue, fetches data from PostgreSQL, runs try-on generation (mock first), and persists results.

## Setup

```bash
cd apps/worker
pip install -r requirements.txt
```

## Run

```bash
# From apps/worker
python main.py
# or
python -m worker.main
```

**If try-on stays at "Queued…"** — the worker is not running or cannot reach Redis/DB:

1. **Redis** must be running (e.g. `docker compose up -d redis` or local Redis on 6379).
2. **API** must have `REDIS_URL` set in `apps/api/.env` (e.g. `REDIS_URL=redis://localhost:6379/0`), otherwise jobs are never pushed to the queue.
3. **Start the worker** in a separate terminal: `cd apps/worker && python -m worker.main`. You should see `Worker started, listening on queue tryon:jobs`.

## Env

- `DATABASE_URL` — PostgreSQL connection string (default: `postgresql://localhost/tryl`)
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379/0`)
- `QUEUE_NAME` — Redis list key for job IDs (default: `tryon:jobs`)

## Queue contract

The API enqueues job IDs when creating try-on jobs:

```python
redis.lpush("tryon:jobs", str(job_id))
```

Worker consumes with `BRPOP tryon:jobs 5`.
