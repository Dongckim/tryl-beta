"""Profile routes."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.dependencies import CurrentUser, get_current_user
from app.db import users_repo
from app.storage import get_storage, profile_image_upload_key
from app.schemas.fitting_profile_version import FittingProfileVersionCreate
from app.schemas.profile import DefaultVersionSet, ProfileCreate, ProfileUpdate
from app.services.profile_service import (
    create_fitting_profile_version,
    create_profile_if_missing,
    get_current_profile,
    get_profile_with_default_version,
    list_profile_versions,
    set_default_version,
    update_profile,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/me")
def get_me(
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Returns the current user's profile and default fitting version if available."""
    result = get_profile_with_default_version(user)
    if result is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result


@router.get("/me/versions")
def get_versions(
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Return all fitting profile versions for the current user.

    Intended for web app & extension to let users pick which version
    (1st/2nd image) to use when triggering try-on.
    """
    versions = list_profile_versions(user)
    return {"versions": versions}


@router.post("")
def create(
    body: ProfileCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Creates a profile if one does not exist."""
    profile = create_profile_if_missing(
        user,
        height_cm=body.height_cm,
        fit_preference=body.fit_preference.value,
        weight_kg=body.weight_kg,
    )
    return profile


@router.patch("/me")
def update_me(
    body: ProfileUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Updates the current user's profile (height_cm, weight_kg, fit_preference)."""
    profile = get_current_profile(user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    updated = update_profile(
        user,
        profile["id"],
        height_cm=body.height_cm,
        weight_kg=body.weight_kg,
        fit_preference=body.fit_preference.value if body.fit_preference else None,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return updated


@router.post("/me/versions/upload")
async def upload_profile_images(
    front_image: UploadFile = File(...),
    side_image: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Upload front and side images; returns URLs for createProfileVersion."""
    user_row = users_repo.get_user_by_email(user["email"])
    if user_row is None:
        raise HTTPException(status_code=401, detail="User not found")
    user_id = user_row["id"]

    if not front_image.content_type or not front_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="front_image must be an image")
    if not side_image.content_type or not side_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="side_image must be an image")

    front_data = await front_image.read()
    side_data = await side_image.read()
    ext = "jpg"
    if "png" in (front_image.content_type or ""):
        ext = "png"
    front_key = profile_image_upload_key(user_id, "front", ext)
    side_key = profile_image_upload_key(user_id, "side", ext)

    try:
        storage = get_storage()
        front_url = storage.put(front_key, front_data, front_image.content_type or "image/jpeg")
        side_url = storage.put(side_key, side_data, side_image.content_type or "image/jpeg")
    except Exception as e:
        logging.getLogger(__name__).exception("Profile image upload failed")
        raise HTTPException(status_code=500, detail="Image upload failed") from e

    return {"front_image_url": front_url, "side_image_url": side_url}


@router.post("/me/versions")
def create_version(
    body: FittingProfileVersionCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Creates a fitting profile version for the current user's profile."""
    profile = get_current_profile(user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_id = profile["id"]
    version = create_fitting_profile_version(
        user,
        profile_id,
        front_image_url=body.front_image_url,
        side_image_url=body.side_image_url,
        back_image_url=body.back_image_url,
        front_mask_url=body.front_mask_url,
        side_mask_url=body.side_mask_url,
    )
    if version is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return version


@router.patch("/me/default-version")
def set_default_version_route(
    body: DefaultVersionSet,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Sets the active default fitting profile version."""
    profile = get_current_profile(user)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")

    profile_id = profile["id"]
    ok = set_default_version(user, profile_id, body.version_id)
    if not ok:
        raise HTTPException(
            status_code=404,
            detail="Invalid version or profile not found",
        )
    return {"default_version_id": body.version_id}
