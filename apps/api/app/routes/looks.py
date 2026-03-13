"""Saved looks (archive) routes."""

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.saved_look import SaveLookRequest, SavedLookResponse
from app.services.archive_service import (
    list_looks,
    list_looks_page,
    list_pinned_looks,
    pin_saved_look,
    save_look,
    save_look_from_job,
    unpin_saved_look,
)

router = APIRouter(prefix="/looks", tags=["looks"])


@router.post("/save", response_model=SavedLookResponse)
def save_look_route(
    body: SaveLookRequest,
    user: CurrentUser = Depends(get_current_user),
) -> SavedLookResponse:
    """Save a completed try-on result for the current user.

    For privacy, the worker now writes results to temporary storage keyed by
    job id. Clients can either:
    - send tryonResultId (legacy / web app), or
    - send jobId (extension: saves directly from a completed job).
    """
    if body.job_id is not None:
        result = save_look_from_job(user, body.job_id, body.note)
    elif body.tryon_result_id is not None:
        result = save_look(user, body.tryon_result_id, body.note)
    else:
        raise HTTPException(
            status_code=422,
            detail="Provide either jobId or tryonResultId",
        )
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Result not found or not owned by user",
        )
    return SavedLookResponse(
        id=result["id"],
        tryon_result_id=result["tryon_result_id"],
        note=result.get("note"),
        created_at=result["created_at"],
        result_image_url=result["result_image_url"],
        thumbnail_url=result.get("thumbnail_url"),
        product_image_url=result.get("product_image_url"),
        product_title=result.get("product_title"),
        product_url=result.get("product_url"),
        product_price=result.get("product_price"),
    )


@router.get("/me", response_model=list[SavedLookResponse])
def list_my_looks(
    user: CurrentUser = Depends(get_current_user),
    limit: int | None = Query(default=None, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[SavedLookResponse]:
    """List the current user's saved looks, newest first. Supports limit/offset pagination."""
    looks = list_looks_page(user, limit=limit, offset=offset) if limit is not None else list_looks(user)
    return [
        SavedLookResponse(
            id=look["id"],
            tryon_result_id=look["tryon_result_id"],
            note=look.get("note"),
            created_at=look["created_at"],
            result_image_url=look["result_image_url"],
            thumbnail_url=look.get("thumbnail_url"),
            product_image_url=look.get("product_image_url"),
            product_title=look.get("product_title"),
            product_url=look.get("product_url"),
            product_price=look.get("product_price"),
            pinned=bool(look.get("pinned", False)),
            pinned_slot=look.get("pinned_slot"),
        )
        for look in looks
    ]


@router.get("/pins", response_model=list[SavedLookResponse])
def list_my_pins(
    user: CurrentUser = Depends(get_current_user),
) -> list[SavedLookResponse]:
    """List the current user's pinned looks (ordered by slot)."""
    looks = list_pinned_looks(user)
    return [
        SavedLookResponse(
            id=look["id"],
            tryon_result_id=look["tryon_result_id"],
            note=look.get("note"),
            created_at=look["created_at"],
            result_image_url=look["result_image_url"],
            thumbnail_url=look.get("thumbnail_url"),
            product_image_url=look.get("product_image_url"),
            product_title=look.get("product_title"),
            product_url=look.get("product_url"),
            product_price=look.get("product_price"),
            pinned=True,
            pinned_slot=look.get("pinned_slot"),
        )
        for look in looks
    ]


@router.post("/{saved_look_id}/pin")
def pin_look_route(
    saved_look_id: int,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Pin a saved look for the current user (max 4)."""
    try:
        slot = pin_saved_look(user, saved_look_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True, "slot": slot}


@router.delete("/{saved_look_id}/pin")
def unpin_look_route(
    saved_look_id: int,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Unpin a saved look for the current user."""
    unpin_saved_look(user, saved_look_id)
    return {"ok": True}
