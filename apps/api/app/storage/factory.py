"""Storage factory. Swap backend via config (local | s3)."""

from app.core.settings import settings
from app.storage.interface import Storage
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage

_storage: Storage | None = None


def get_storage() -> Storage:
    """Return configured storage backend. S3 when storage_backend=s3 and s3_bucket set."""
    global _storage
    if _storage is None:
        if settings.storage_backend == "s3" and (settings.s3_bucket or "").strip():
            _storage = S3Storage()
        else:
            _storage = LocalStorage()
    return _storage
