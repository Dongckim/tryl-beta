"""
Prometheus metrics for the worker.

Exposes:
  - tryon_jobs_processed_total{status}  : Counter (status=completed|failed)
  - tryon_job_duration_seconds          : Histogram (successful jobs)
  - tryon_job_retries_total             : Counter (retry attempts enqueued)
  - tryon_worker_up                     : Gauge (1 while the worker loop is alive)

Call ``start_metrics_server(port)`` once at worker boot to expose /metrics.
"""

from prometheus_client import Counter, Gauge, Histogram, start_http_server

tryon_jobs_processed_total = Counter(
    "tryon_jobs_processed_total",
    "Total try-on jobs processed, labelled by terminal status",
    ["status"],
)

tryon_job_duration_seconds = Histogram(
    "tryon_job_duration_seconds",
    "Wall-clock duration of try-on jobs (success + failure)",
    buckets=(0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300),
)

tryon_job_retries_total = Counter(
    "tryon_job_retries_total",
    "Total try-on jobs re-enqueued for retry",
)

tryon_worker_up = Gauge(
    "tryon_worker_up",
    "1 while the worker consumer loop is running",
)


def start_metrics_server(port: int = 9108) -> None:
    """Start the Prometheus /metrics HTTP endpoint on ``port``."""
    start_http_server(port)
    tryon_worker_up.set(1)
