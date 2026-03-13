"""Provider factory. Returns configured try-on provider."""

from worker.core.config import settings
from worker.providers.interface import TryOnProvider
from worker.providers.mock import MockProvider
from worker.providers.nano_banana import NanoBananaProvider


def get_provider(job_id: int) -> TryOnProvider:
    """Return the configured try-on provider for the given job."""
    if settings.tryon_provider == "mock":
        return MockProvider(job_id=job_id)
    if settings.tryon_provider == "nano_banana":
        return NanoBananaProvider(job_id=job_id)
    return MockProvider(job_id=job_id)
