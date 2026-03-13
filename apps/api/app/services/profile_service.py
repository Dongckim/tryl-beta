"""Profile service. Business logic; delegates SQL to repositories."""

from typing import TypedDict

from app.db import fitting_profile_version_repo, user_profile_repo, users_repo
from app.storage import normalize_storage_url


class CurrentUser(TypedDict):
    id: str
    email: str


def _resolve_user_id(user: CurrentUser) -> int:
    """Resolve current user to DB user_id. Creates user if missing."""
    row = users_repo.get_or_create_user(user["email"])
    return row["id"]


def get_current_profile(user: CurrentUser) -> dict | None:
    """Get the current user's profile. Returns None if none exists."""
    user_id = _resolve_user_id(user)
    return user_profile_repo.get_profile_by_user_id(user_id)


def get_profile_with_default_version(user: CurrentUser) -> dict | None:
    """Get current profile with default fitting version if set. Returns None if no profile."""
    profile = get_current_profile(user)
    if profile is None:
        return None
    default_version = fitting_profile_version_repo.get_default_fitting_profile_version(
        profile["id"]
    )
    if default_version is not None:
        default_version = _normalize_version_image_urls(default_version)
    return {"profile": profile, "default_version": default_version}


def list_profile_versions(user: CurrentUser) -> list[dict]:
    """Return all fitting profile versions for the current user's profile."""
    profile = get_current_profile(user)
    if profile is None:
        return []

    user_profile_id = profile["id"]
    rows = fitting_profile_version_repo.list_fitting_profile_versions(user_profile_id)
    # Normalize URLs for current storage backend.
    return [_normalize_version_image_urls(row) for row in rows]


def _normalize_version_image_urls(version: dict) -> dict:
    """Rewrite old local storage URLs to current backend URL (e.g. S3) for display."""
    out = dict(version)
    for key in ("front_image_url", "side_image_url", "back_image_url", "front_mask_url", "side_mask_url"):
        if key in out and out[key]:
            normalized = normalize_storage_url(out[key])
            if normalized is not None:
                out[key] = normalized
    return out


def create_profile_if_missing(
    user: CurrentUser,
    height_cm: float,
    fit_preference: str,
    weight_kg: float | None = None,
) -> dict:
    """Create a profile for the user if none exists. Returns the profile."""
    user_id = _resolve_user_id(user)
    profile = user_profile_repo.get_profile_by_user_id(user_id)
    if profile is not None:
        return profile
    return user_profile_repo.create_profile(
        user_id=user_id,
        height_cm=height_cm,
        fit_preference=fit_preference,
        weight_kg=weight_kg,
    )


def update_profile(
    user: CurrentUser,
    profile_id: int,
    *,
    height_cm: float | None = None,
    weight_kg: float | None = None,
    fit_preference: str | None = None,
    default_profile_version_id: int | None = None,
) -> dict | None:
    """Update a profile. Ensures profile belongs to user. Returns updated row or None."""
    user_id = _resolve_user_id(user)
    profile = user_profile_repo.get_profile_by_id(profile_id)
    if profile is None or profile["user_id"] != user_id:
        return None
    return user_profile_repo.update_profile(
        profile_id,
        height_cm=height_cm,
        weight_kg=weight_kg,
        fit_preference=fit_preference,
        default_profile_version_id=default_profile_version_id,
    )


def create_fitting_profile_version(
    user: CurrentUser,
    user_profile_id: int,
    front_image_url: str,
    side_image_url: str,
    *,
    back_image_url: str | None = None,
    front_mask_url: str | None = None,
    side_mask_url: str | None = None,
    front_pose_json: dict | None = None,
    side_pose_json: dict | None = None,
    quality_score: float | None = None,
) -> dict | None:
    """Create a fitting profile version. Ensures profile belongs to user."""
    user_id = _resolve_user_id(user)
    profile = user_profile_repo.get_profile_by_id(user_profile_id)
    if profile is None or profile["user_id"] != user_id:
        return None
    return fitting_profile_version_repo.create_fitting_profile_version(
        user_profile_id=user_profile_id,
        front_image_url=front_image_url,
        side_image_url=side_image_url,
        back_image_url=back_image_url,
        front_mask_url=front_mask_url,
        side_mask_url=side_mask_url,
        front_pose_json=front_pose_json,
        side_pose_json=side_pose_json,
        quality_score=quality_score,
    )


def set_default_version(
    user: CurrentUser,
    user_profile_id: int,
    version_id: int,
) -> bool:
    """Set the default fitting profile version. Ensures profile belongs to user."""
    user_id = _resolve_user_id(user)
    profile = user_profile_repo.get_profile_by_id(user_profile_id)
    if profile is None or profile["user_id"] != user_id:
        return False
    return fitting_profile_version_repo.set_default_fitting_profile_version(
        user_profile_id, version_id
    )
