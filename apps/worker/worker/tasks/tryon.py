"""
Try-on job task: consume job IDs from Redis, process via service.
"""

import logging

import redis

from worker.core.config import settings
from worker.services.tryon_service import process_tryon_job

logger = logging.getLogger(__name__)


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
    r = redis.from_url(settings.redis_url, decode_responses=True)

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
            # Job remains in processing/failed; no retry here for MVP
