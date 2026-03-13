"""Queue helper for enqueueing worker tasks."""

import logging

from app.core.settings import settings

logger = logging.getLogger(__name__)


def enqueue_tryon_job(job_id: int) -> None:
    """
    Enqueue a try-on job for worker processing.
    No-op if Redis is not configured.
    """
    if not settings.redis_url:
        logger.warning("Redis not configured; try-on job %s not enqueued", job_id)
        return

    try:
        import redis

        r = redis.from_url(settings.redis_url, decode_responses=True)
        r.lpush(settings.tryon_queue_name, str(job_id))
        logger.info("Enqueued try-on job %s", job_id)
    except Exception as e:
        logger.exception("Failed to enqueue try-on job %s: %s", job_id, e)
        raise
