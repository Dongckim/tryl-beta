"""Archive service. Saved looks (bookmarked try-on results)."""

import base64
from typing import TypedDict

import httpx

from app.db import pinned_look_repo, saved_look_repo, tryon_repo, users_repo
from app.db import product_repo
from app.services.temp_results import get_temp_result, delete_temp_result
from app.storage import get_storage, tryon_result_key


class CurrentUser(TypedDict):
    id: str
    email: str


def _resolve_user_id(user: CurrentUser) -> int:
    """Resolve current user to DB user_id."""
    row = users_repo.get_or_create_user(user["email"])
    return row["id"]


def save_look(
    user: CurrentUser,
    tryon_result_id: int,
    note: str | None = None,
) -> dict | None:
    """
    Save a completed try-on result for the current user.
    Returns the saved look, or None if result not found or not owned by user.
    """
    user_id = _resolve_user_id(user)
    result = tryon_repo.get_tryon_result_by_id(tryon_result_id)
    if result is None:
        return None

    job = tryon_repo.get_tryon_job_by_id(result["tryon_job_id"])
    if job is None or job["user_id"] != user_id:
        return None

    saved = saved_look_repo.save_look(
        user_id=user_id,
        tryon_result_id=tryon_result_id,
        note=note,
    )
    saved["result_image_url"] = result["result_image_url"]
    saved["thumbnail_url"] = result.get("thumbnail_url")
    saved["product_image_url"] = result.get("product_image_url")
    return saved


def save_look_from_job(
    user: CurrentUser,
    tryon_job_id: int,
    note: str | None = None,
) -> dict | None:
    """
    Save a completed try-on job for the current user.

    This promotes a temporary Redis-stored result to a persistent
    tryon_results row and then creates/updates a saved_look.
    """
    user_id = _resolve_user_id(user)

    job = tryon_repo.get_tryon_job_by_id(tryon_job_id)
    if job is None or job["user_id"] != user_id or job["status"] != "completed":
        return None

    # If a persistent result already exists (legacy or previously saved), just reuse it.
    existing = tryon_repo.get_tryon_result_by_job_id(tryon_job_id)
    if existing is not None:
        saved = saved_look_repo.save_look(
            user_id=user_id,
            tryon_result_id=existing["id"],
            note=note,
        )
        saved["result_image_url"] = existing["result_image_url"]
        saved["thumbnail_url"] = existing.get("thumbnail_url")
        saved["product_image_url"] = existing.get("product_image_url")
        return saved

    temp = get_temp_result(tryon_job_id)
    if temp is None:
        return None

    image_b64 = temp.get("image_base64")
    external_url = temp.get("external_url")
    mime = temp.get("mime_type") or "image/jpeg"
    thumb_b64 = temp.get("thumbnail_base64")

    storage = get_storage()

    # Decide how to obtain the final main image URL.
    if image_b64:
        try:
            main_bytes = base64.b64decode(image_b64)
        except Exception:
            return None
        ext = "png" if mime.endswith("png") else "jpg"
        key = tryon_result_key(tryon_job_id, variant="main", ext=ext)
        result_url = storage.put(key, main_bytes, mime)
    elif external_url:
        # Provider controls the URL; we simply persist the reference.
        result_url = external_url
    else:
        return None

    thumb_url = None
    if thumb_b64:
        try:
            thumb_bytes = base64.b64decode(thumb_b64)
            ext = "png" if mime.endswith("png") else "jpg"
            thumb_key = tryon_result_key(tryon_job_id, variant="thumb", ext=ext)
            thumb_url = storage.put(thumb_key, thumb_bytes, mime)
        except Exception:
            thumb_url = None

    metadata = temp.get("metadata") or {}
    provider = metadata.get("provider") or job.get("provider")
    if provider:
        metadata["provider"] = provider

    # Upload product image to S3 at save time (was not stored during try-on).
    product_image_url = None
    product = product_repo.get_product_by_id(job["product_id"]) if job.get("product_id") else None
    if product and product.get("image_url"):
        try:
            with httpx.Client(timeout=15.0) as client:
                r = client.get(product["image_url"])
                r.raise_for_status()
                body = r.content
                ct = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        except Exception:
            body = None
            ct = "image/jpeg"
        if body:
            ext = "png" if "png" in ct else "jpg"
            key = tryon_result_key(tryon_job_id, variant="product", ext=ext)
            product_image_url = storage.put(key, body, ct)

    # Create persistent tryon_result row.
    result = tryon_repo.create_tryon_result(
        tryon_job_id=tryon_job_id,
        result_image_url=result_url,
        thumbnail_url=thumb_url,
        product_image_url=product_image_url,
        metadata_json=metadata,
    )

    # Now create/update saved_look for this user.
    saved = saved_look_repo.save_look(
        user_id=user_id,
        tryon_result_id=result["id"],
        note=note,
    )
    saved["result_image_url"] = result["result_image_url"]
    saved["thumbnail_url"] = result.get("thumbnail_url")
    saved["product_image_url"] = result.get("product_image_url")

    # Best-effort cleanup of temporary cache.
    delete_temp_result(tryon_job_id)
    return saved


def list_looks(user: CurrentUser) -> list[dict]:
    """List the user's saved looks, newest first."""
    user_id = _resolve_user_id(user)
    return saved_look_repo.list_looks_by_user(user_id)


def list_looks_page(user: CurrentUser, limit: int, offset: int) -> list[dict]:
    """List the user's saved looks with pagination (newest first)."""
    user_id = _resolve_user_id(user)
    return saved_look_repo.list_looks_by_user_page(user_id, limit=limit, offset=offset)


def pin_saved_look(user: CurrentUser, saved_look_id: int) -> int:
    """Pin a saved look for the current user into the leftmost empty slot. Returns assigned slot."""
    user_id = _resolve_user_id(user)

    existing = pinned_look_repo.get_slot_for_saved_look(user_id, saved_look_id)
    if existing is not None:
        return existing

    slots = set(pinned_look_repo.list_slots(user_id))
    for slot in range(4):
        if slot not in slots:
            return pinned_look_repo.pin_look(user_id, slot=slot, saved_look_id=saved_look_id)
    raise ValueError("Pin limit reached")


def unpin_saved_look(user: CurrentUser, saved_look_id: int) -> None:
    """Unpin a saved look for the current user."""
    user_id = _resolve_user_id(user)
    pinned_look_repo.unpin_look(user_id, saved_look_id)


def list_pinned_looks(user: CurrentUser) -> list[dict]:
    """List pinned looks for the current user, ordered by slot."""
    user_id = _resolve_user_id(user)
    return saved_look_repo.list_pinned_looks(user_id)
