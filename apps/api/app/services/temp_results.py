"""
Temporary try-on result storage (Redis).

The worker writes generated images to Redis keyed by job id instead of S3.
The API reads from this cache to serve results, and only uploads to S3
and creates tryon_results rows when the user explicitly saves a look.
"""

from __future__ import annotations

import json
from typing import Any, TypedDict

import redis  # type: ignore[import-not-found]

from app.core.settings import settings


class TempTryonResult(TypedDict, total=False):
  job_id: int
  image_base64: str | None
  thumbnail_base64: str | None
  mime_type: str
  provider: str
  metadata: dict[str, Any] | None
  created_at: str
  external_url: str | None


def _has_redis() -> bool:
  return bool(settings.redis_url)


def _redis() -> "redis.Redis[str]":
  assert settings.redis_url, "redis_url must be configured to use temp results"
  return redis.from_url(settings.redis_url, decode_responses=True)


def _key(job_id: int) -> str:
  return f"tryon:temp:{job_id}"


def get_temp_result(job_id: int) -> TempTryonResult | None:
  """Fetch a temporary result by job id, or None if missing/expired/unavailable."""
  if not _has_redis():
    return None
  raw = _redis().get(_key(job_id))
  if raw is None:
    return None
  try:
    data = json.loads(raw)
    if not isinstance(data, dict):
      return None
    return data  # type: ignore[return-value]
  except Exception:
    return None


def delete_temp_result(job_id: int) -> None:
  """Delete any temporary result for the given job id."""
  if not _has_redis():
    return
  _redis().delete(_key(job_id))

