"""
Try-on job task: consume job IDs from Redis, process via service.
"""

import logging
import time

import redis as redis_lib

from worker.core.config import settings
from worker.repositories import tryon_repo
from worker.services.tryon_service import process_tryon_job

logger = logging.getLogger(__name__)

# Errors that should NOT be retried (config / permanent issues)
_NO_RETRY_PREFIXES = ("CONFIG:",)


def _is_retryable(job_id: int) -> bool:
    """Check if a failed job is eligible for retry."""
    job = tryon_repo.get_tryon_job_by_id(job_id)
    if job is None:
        return False
    retry_count = job.get("retry_count", 0)
    error_msg = job.get("error_message") or ""
    if retry_count >= settings.max_job_retries:
        return False
    if any(error_msg.startswith(p) for p in _NO_RETRY_PREFIXES):
        return False
    return True


def _requeue(job_id: int, r: redis_lib.Redis) -> None:  # type: ignore[type-arg]
    """Re-queue a job for retry with backoff delay."""
    row = tryon_repo.requeue_job_for_retry(job_id)
    if row is None:
        return
    retry_num = row["retry_count"]
    backoff = min(settings.retry_backoff_seconds * (2 ** (retry_num - 1)), 30)
    logger.info("Re-queuing job %s for retry #%d (backoff %.1fs)", job_id, retry_num, backoff)
    time.sleep(backoff)
    r.lpush(settings.queue_name, str(job_id))


def run_tryon_task(job_id: int) -> None:
    """Process a single try-on job by id."""
    logger.info("Processing try-on job %s", job_id)
    process_tryon_job(job_id)
    logger.info("Finished try-on job %s", job_id)


def consume_tryon_queue() -> None:
    """
    Block and consume try-on job IDs from Redis queue.
    Uses BRPOP for blocking wait. Runs until interrupted.
    """
    r = redis_lib.from_url(settings.redis_url, decode_responses=True)

    logger.info("Worker started, listening on queue %s", settings.queue_name)

    while True:
        # Block up to 5s; allows graceful shutdown on SIGTERM
        result = r.brpop(settings.queue_name, timeout=5)
        if result is None:
            continue

        _, job_id_str = result
        try:
            job_id = int(job_id_str)
        except ValueError:
            logger.warning("Invalid job_id in queue: %s", job_id_str)
            continue

        try:
            run_tryon_task(job_id)
        except Exception as e:
            logger.exception("Error processing job %s: %s", job_id, e)
            # Attempt retry if eligible
            try:
                if _is_retryable(job_id):
                    _requeue(job_id, r)
                else:
                    logger.warning("Job %s not retryable, staying failed", job_id)
            except Exception:
                logger.exception("Failed to re-queue job %s", job_id)
