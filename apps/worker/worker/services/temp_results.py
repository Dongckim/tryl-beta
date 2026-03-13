"""
Temporary storage for try-on results.

For privacy, the worker writes generated images to Redis instead of S3.
The API later reads these when the user views the result, and only uploads
to S3 when the user explicitly saves the look.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

import redis

from worker.core.config import settings


class TempTryonResult(TypedDict, total=False):
    job_id: int
    image_base64: str | None
    thumbnail_base64: str | None
    mime_type: str
    provider: str
    metadata: dict[str, Any] | None
    created_at: str


def _redis() -> "redis.Redis[str]":
    return redis.from_url(settings.redis_url, decode_responses=True)


def _key(job_id: int) -> str:
    return f"tryon:temp:{job_id}"


def save_temp_result(job_id: int, payload: TempTryonResult, *, ttl_seconds: int = 3600) -> None:
    """
    Store a temporary try-on result for a job in Redis.

    The payload is JSON-encoded and given a TTL so it expires automatically
    if the user never saves the look.
    """
    data: TempTryonResult = {
        "job_id": job_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    r = _redis()
    r.setex(_key(job_id), ttl_seconds, json.dumps(data))


def get_temp_result(job_id: int) -> TempTryonResult | None:
    """Fetch a temporary result for the given job id, or None if missing/expired."""
    r = _redis()
    raw = r.get(_key(job_id))
    if raw is None:
        return None
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return None
        # Best-effort typing
        return data  # type: ignore[return-value]
    except Exception:
        return None


def delete_temp_result(job_id: int) -> None:
    """Delete any temporary result for the given job id."""
    r = _redis()
    r.delete(_key(job_id))

