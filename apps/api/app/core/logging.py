"""
Structured JSON logging configuration.

In production (APP_ENV != development), logs are emitted as JSON for
CloudWatch / ELK / Datadog ingestion. In development, human-readable
format is kept for convenience.
"""

import json
import logging
import sys
from datetime import datetime, timezone

from app.core.settings import settings


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info and record.exc_info[1]:
            log["exception"] = self.formatException(record.exc_info)
        if hasattr(record, "request_id"):
            log["request_id"] = record.request_id  # type: ignore[attr-defined]
        return json.dumps(log, ensure_ascii=False)


def setup_logging() -> None:
    if settings.app_env == "development":
        fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        logging.basicConfig(level=logging.INFO, format=fmt, stream=sys.stdout)
    else:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logging.root.handlers = [handler]
        logging.root.setLevel(logging.INFO)
