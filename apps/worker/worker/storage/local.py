"""
Local storage backend. Writes to disk; returns base_url + key.
Replace with S3/GCS implementation later.
"""

from pathlib import Path

from worker.core.config import settings
from worker.storage.interface import Storage, StorageKey


class LocalStorage:
    """Local filesystem storage. For dev; swap for cloud in production."""

    def __init__(self, *, base_path: str | None = None, base_url: str | None = None):
        self.base_path = Path(base_path or settings.storage_base_path)
        self.base_url = base_url or settings.storage_base_url

    def put(self, key: StorageKey, data: bytes, content_type: str) -> str:
        """Write to disk; return stable URL."""
        full_path = self.base_path / key.path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_bytes(data)
        return self.url_for(key)

    def url_for(self, key: StorageKey) -> str:
        """Return URL for key. No signing for now."""
        return f"{self.base_url.rstrip('/')}/{key.path}"
