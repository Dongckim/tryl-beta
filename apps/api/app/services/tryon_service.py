"""Try-on job service. Business logic; delegates SQL to repositories."""

from typing import TypedDict

from app.services.queue import enqueue_tryon_job
from app.services.temp_results import get_temp_result
from app.db import (
    fitting_profile_version_repo,
    product_repo,
    tryon_repo,
    user_profile_repo,
    users_repo,
)


class CurrentUser(TypedDict):
    id: str
    email: str


def _resolve_user_id(user: CurrentUser) -> int:
    """Resolve current user to DB user_id."""
    row = users_repo.get_or_create_user(user["email"])
    return row["id"]


def create_tryon_job(
    user: CurrentUser,
    product_id: int,
    fitting_profile_version_id: int | None = None,
    *,
    product_image_url_override: str | None = None,
) -> dict | None:
    """
    Create a try-on job.

    If fitting_profile_version_id is provided, use that version (after verifying
    that it belongs to the current user's profile). Otherwise, fall back to the
    user's default/active fitting profile version.

    Returns job dict with id and status, or None if profile/version/product missing.
    """
    user_id = _resolve_user_id(user)
    profile = user_profile_repo.get_profile_by_user_id(user_id)
    if profile is None:
        return None

    # Resolve which fitting profile version to use.
    version = None
    if fitting_profile_version_id is not None:
        # Explicit version requested: ensure it belongs to this profile.
        candidate = fitting_profile_version_repo.get_fitting_profile_version_by_id(
            fitting_profile_version_id
        )
        if candidate is not None and candidate["user_profile_id"] == profile["id"]:
            version = candidate

    if version is None:
        # Fallback: use default/active version for this profile.
        version = fitting_profile_version_repo.get_fitting_profile_version_or_default(
            profile["id"]
        )
    if version is None:
        return None

    if product_repo.get_product_by_id(product_id) is None:
        return None

    job = tryon_repo.create_tryon_job(
        user_id=user_id,
        product_id=product_id,
        fitting_profile_version_id=version["id"],
        override_product_image_url=product_image_url_override,
    )
    if job:
        enqueue_tryon_job(job["id"])
    return job


def get_job_status(user: CurrentUser, job_id: int) -> dict | None:
    """Get job status. Returns None if job not found or not owned by user."""
    user_id = _resolve_user_id(user)
    job = tryon_repo.get_tryon_job_by_id(job_id)
    if job is None or job["user_id"] != user_id:
        return None
    return job


def get_job_result(user: CurrentUser, job_id: int) -> dict | None:
    """
    Get job result if completed.

    For privacy, the worker now writes results to a temporary Redis cache
    instead of S3/tryon_results. We first try Redis; if nothing is found,
    we fall back to the persistent tryon_results table (for already-saved
    looks or legacy data).
    """
    job = get_job_status(user, job_id)
    if job is None:
        return None
    if job["status"] != "completed":
        return None
    # 1. Try Redis-based temporary result
    temp = get_temp_result(job_id)
    if temp and (temp.get("image_base64") or temp.get("external_url")):
        image_b64 = temp.get("image_base64")
        mime = temp.get("mime_type") or "image/jpeg"
        external_url = temp.get("external_url")

        if image_b64:
            result_image_url = f"data:{mime};base64,{image_b64}"
        elif external_url:
            # Provider gave us its own URL; use as-is.
            result_image_url = external_url
        else:
            return None

        thumb_b64 = temp.get("thumbnail_base64")
        thumbnail_url = (
            f"data:{mime};base64,{thumb_b64}" if thumb_b64 else None
        )
        # Shape the dict like tryon_results row so routers/schemas stay the same.
        return {
            "id": job_id,  # synthetic id for temporary result
            "tryon_job_id": job_id,
            "result_image_url": result_image_url,
            "thumbnail_url": thumbnail_url,
            "metadata_json": temp.get("metadata"),
            "created_at": job["completed_at"] or job["created_at"],
        }

    # 2. Fallback: persistent result (already promoted/saved)
    result = tryon_repo.get_tryon_result_by_job_id(job_id)
    return result


def mock_complete_job(user: CurrentUser, job_id: int) -> dict | None:
    """
    DEV ONLY: Mark a queued job as completed with a mock result.
    Returns the created result, or None if job not found, not owned, or not queued.
    """
    from datetime import datetime, timezone

    job = get_job_status(user, job_id)
    if job is None:
        return None
    if job["status"] != "queued":
        return None

    tryon_repo.update_tryon_job_status(
        job_id,
        "completed",
        completed_at=datetime.now(timezone.utc),
    )
    result = tryon_repo.create_tryon_result(
        tryon_job_id=job_id,
        result_image_url=f"https://mock.tryl.local/results/{job_id}.jpg",
        thumbnail_url=f"https://mock.tryl.local/results/{job_id}_thumb.jpg",
    )
    return result
