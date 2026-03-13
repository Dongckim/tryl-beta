"""Storage factory. Swap backend via config."""

from worker.core.config import settings
from worker.storage.interface import Storage
from worker.storage.local import LocalStorage
from worker.storage.s3 import S3Storage

_storage: Storage | None = None


def get_storage() -> Storage:
    """Return configured storage backend."""
    global _storage
    if _storage is None:
        if settings.storage_backend == "s3" and (settings.s3_bucket or "").strip():
            _storage = S3Storage()
        else:
            _storage = LocalStorage()
    return _storage
