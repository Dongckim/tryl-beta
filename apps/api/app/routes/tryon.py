"""Try-on job routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import CurrentUser, get_current_user
from app.core.settings import settings
from app.schemas.tryon import (
    TryonJobCreate,
    TryonJobCreateResponse,
    TryonJobResultResponse,
    TryonJobStatusResponse,
)
from app.services.tryon_service import (
    BetaLimitReachedError,
    create_tryon_job,
    get_job_result,
    get_job_status,
    mock_complete_job,
)

router = APIRouter(prefix="/tryon", tags=["tryon"])


@router.post("/jobs", response_model=TryonJobCreateResponse)
def create_job(
    body: TryonJobCreate,
    user: CurrentUser = Depends(get_current_user),
) -> TryonJobCreateResponse:
    """Create a try-on job for a product and an optional fitting profile version."""
    try:
        job = create_tryon_job(
            user,
            product_id=body.product_id,
            fitting_profile_version_id=body.fitting_profile_version_id,
            product_image_url_override=body.product_image_url_override,
            profile_photo_index=body.profile_photo_index or 1,
        )
    except BetaLimitReachedError:
        raise HTTPException(
            status_code=429,
            detail="Beta limit reached",
        )
    if job is None:
        raise HTTPException(
            status_code=400,
            detail="Profile, fitting version, or product not found",
        )
    return TryonJobCreateResponse(jobId=job["id"], status=job["status"])


@router.get("/jobs/{job_id}", response_model=TryonJobStatusResponse)
def get_job(
    job_id: int,
    user: CurrentUser = Depends(get_current_user),
) -> TryonJobStatusResponse:
    """Get current job status."""
    job = get_job_status(user, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return TryonJobStatusResponse(
        id=job["id"],
        status=job["status"],
        error_message=job.get("error_message"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at"),
    )


@router.get("/jobs/{job_id}/result", response_model=TryonJobResultResponse)
def get_job_result_route(
    job_id: int,
    user: CurrentUser = Depends(get_current_user),
) -> TryonJobResultResponse:
    """Get try-on result if job is completed."""
    result = get_job_result(user, job_id)
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Result not found or job not completed",
        )
    return TryonJobResultResponse(
        id=result["id"],
        tryon_job_id=result["tryon_job_id"],
        result_image_url=result["result_image_url"],
        thumbnail_url=result.get("thumbnail_url"),
        created_at=result["created_at"],
    )


@router.post(
    "/jobs/{job_id}/mock-complete",
    response_model=TryonJobResultResponse,
    include_in_schema=False,
)
def mock_complete_job_route(
    job_id: int,
    user: CurrentUser = Depends(get_current_user),
) -> TryonJobResultResponse:
    """
    DEV ONLY: Mark a queued try-on job as completed with a mock result image.
    Disabled when app_env != "development". For local MVP testing only.
    """
    if settings.app_env != "development":
        raise HTTPException(status_code=404, detail="Not found")

    result = mock_complete_job(user, job_id)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Job not found, not owned by user, or not queued",
        )
    return TryonJobResultResponse(
        id=result["id"],
        tryon_job_id=result["tryon_job_id"],
        result_image_url=result["result_image_url"],
        thumbnail_url=result.get("thumbnail_url"),
        created_at=result["created_at"],
    )
