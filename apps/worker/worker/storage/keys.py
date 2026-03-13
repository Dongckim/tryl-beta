"""Key builders for stable storage paths."""

from worker.storage.interface import StorageKey


def profile_image_key(user_id: int, version_id: int, role: str, ext: str = "jpg") -> StorageKey:
    """Key for fitting profile image. role: front, side, back, front_mask, side_mask."""
    return StorageKey(path=f"profiles/{user_id}/{version_id}/{role}.{ext}")


def tryon_result_key(job_id: int, variant: str = "main", ext: str = "jpg") -> StorageKey:
    """Key for try-on result. variant: main, thumb."""
    return StorageKey(path=f"results/{job_id}/{variant}.{ext}")
