## Worker reliability policy (MVP)

This describes how the async try-on worker should behave under failures and slow external dependencies.

### Timeouts

The worker uses two timeouts:

- **Image fetch timeout**: `FETCH_TIMEOUT_SECONDS` (default 20s)
- **Provider API timeout**: `PROVIDER_TIMEOUT_SECONDS` (default 120s)

These map to `apps/worker/worker/core/config.py` settings:

- `fetch_timeout_seconds`
- `provider_timeout_seconds`

### Retries / backoff

External HTTP calls (image fetch + provider API call) use a minimal exponential backoff policy:

- Attempts: `RETRY_ATTEMPTS` (default 2; i.e. 1 retry)
- Backoff: `RETRY_BACKOFF_SECONDS` (default 1.0)
- Backoff pattern: \(base \times 2^i\)
- Retry conditions:
  - network errors (requests exceptions)
  - HTTP 5xx responses

No retries are performed for 4xx responses (assumed input/config issues).

### Error classification / formatting

Worker failures are persisted to `tryon_jobs.error_message` and should be consistent.

Current prefixes:

- `CONFIG:` missing required configuration (e.g. API key/url)
- `TIMEOUT:` request timed out
- `FETCH:` failed to fetch an image URL
- `PROVIDER:` provider API error
- `FAILED:` generic fallback

Messages are truncated to 500 characters to avoid oversized DB rows / UI overflow.

### What the worker MUST NOT do

- Do not upload results to long-term storage by default (privacy). Persist only to temporary cache.
- Do not silently “succeed” with invalid results. If no result URL or inline data is present, fail the job.

