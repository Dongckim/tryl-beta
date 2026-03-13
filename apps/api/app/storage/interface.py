"""Storage interface. Implement for S3, GCS, etc."""

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class StorageKey:
    """Stable key for a stored object."""

    path: str

    def __str__(self) -> str:
        return self.path


class Storage(Protocol):
    """Protocol for private user image storage."""

    def put(self, key: StorageKey, data: bytes, content_type: str) -> str:
        """
        Store data. Returns stable URL or key for DB.
        """
        ...

    def url_for(self, key: StorageKey) -> str:
        """Return URL for display."""
        ...
