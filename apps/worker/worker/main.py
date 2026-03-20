"""
Worker entry point. Consumes try-on jobs from Redis queue.
"""

import json
import logging
import sys
from datetime import datetime, timezone

import sentry_sdk

from worker.core.config import settings
from worker.tasks.tryon import consume_tryon_queue


class _JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "worker",
        }
        if record.exc_info and record.exc_info[1]:
            log["exception"] = self.formatException(record.exc_info)
        return json.dumps(log, ensure_ascii=False)


# Use JSON logging in production, human-readable in dev
if settings.sentry_dsn:  # rough proxy: sentry_dsn set → production
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(_JSONFormatter())
    logging.root.handlers = [_handler]
    logging.root.setLevel(logging.INFO)
else:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment="worker",
        send_default_pii=True,
        enable_logs=True,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        profile_session_sample_rate=1.0,
        profile_lifecycle="trace",
    )


def main() -> None:
    consume_tryon_queue()


if __name__ == "__main__":
    main()
