"""Lightweight storage abstraction for user images."""

from app.storage.factory import get_storage
from app.storage.interface import Storage, StorageKey
from app.storage.keys import profile_image_key, profile_image_upload_key, tryon_result_key
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage


def normalize_storage_url(url: str | None) -> str | None:
    """
    If url is the old local base URL (storage.tryl.local), return the current
    storage backend URL for that path so GET responses show S3/correct URLs.
    Otherwise return url unchanged.
    """
    if not url or not url.strip():
        return url
    from app.core.settings import settings

    base = (settings.storage_base_url or "").rstrip("/")
    if not base:
        return url
    if not (url.startswith(base + "/") or url == base):
        return url
    path = url[len(base) :].lstrip("/")
    return get_storage().url_for(StorageKey(path=path))


__all__ = [
    "get_storage",
    "normalize_storage_url",
    "Storage",
    "StorageKey",
    "LocalStorage",
    "S3Storage",
    "profile_image_key",
    "profile_image_upload_key",
    "tryon_result_key",
]
