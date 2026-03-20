import logging

import psycopg
from fastapi import APIRouter

from app.core.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Readiness probe: checks DB and Redis connectivity."""
    checks: dict[str, str] = {}

    # DB check
    try:
        with psycopg.connect(settings.database_url) as conn:
            conn.execute("SELECT 1")
        checks["db"] = "ok"
    except Exception as e:
        logger.error("Health check DB failed: %s", e)
        checks["db"] = "error"

    # Redis check
    if settings.redis_url:
        try:
            import redis

            r = redis.from_url(settings.redis_url)
            r.ping()
            checks["redis"] = "ok"
        except Exception as e:
            logger.error("Health check Redis failed: %s", e)
            checks["redis"] = "error"

    healthy = all(v == "ok" for v in checks.values())
    return {"status": "ok" if healthy else "degraded", "checks": checks}


@router.get("/healthz")
def healthz() -> dict[str, str]:
    # Lightweight liveness probe for load balancers / orchestration.
    return {"status": "ok"}


@router.get("/sentry-debug")
async def trigger_error() -> dict:
    """Trigger a test error to verify Sentry integration. Only works when SENTRY_DSN is set."""
    if not settings.sentry_dsn:
        return {"error": "SENTRY_DSN is not configured"}
    division_by_zero = 1 / 0
