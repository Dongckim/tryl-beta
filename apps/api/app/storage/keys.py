"""Key builders for stable storage paths."""

import uuid

from app.storage.interface import StorageKey


def profile_image_upload_key(user_id: int, role: str, ext: str = "jpg") -> StorageKey:
    """Key for uploaded fitting profile image (before version exists)."""
    return StorageKey(path=f"profiles/{user_id}/fitting/{uuid.uuid4().hex}_{role}.{ext}")


def profile_image_key(user_id: int, version_id: int, role: str, ext: str = "jpg") -> StorageKey:
    """Key for fitting profile image. role: front, side, back, front_mask, side_mask."""
    return StorageKey(path=f"profiles/{user_id}/{version_id}/{role}.{ext}")


def tryon_result_key(job_id: int, variant: str = "main", ext: str = "jpg") -> StorageKey:
    """Key for try-on result. variant: main, thumb, product."""
    return StorageKey(path=f"results/{job_id}/{variant}.{ext}")


def product_image_upload_key(user_id: int, ext: str = "jpg") -> StorageKey:
    """Key for product image uploaded via extension (S3 proxy for store CDN)."""
    return StorageKey(path=f"products/{user_id}/{uuid.uuid4().hex}.{ext}")
