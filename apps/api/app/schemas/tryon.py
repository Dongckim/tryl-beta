"""Try-on job schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import TryonJobStatus


class TryonJobCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    product_id: int = Field(..., alias="productId")
    fitting_profile_version_id: int | None = Field(
        default=None, alias="fittingProfileVersionId"
    )
    # Optional override for product image URL (e.g. S3 proxy uploaded by extension).
    product_image_url_override: str | None = Field(
        default=None, alias="productImageUrlOverride"
    )
    # Which profile photo to use: 1 = front (1st), 2 = side (2nd). Default 1.
    profile_photo_index: int | None = Field(default=1, alias="profilePhotoIndex", ge=1, le=2)


class TryonJobCreateResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    job_id: int = Field(..., alias="jobId")
    status: str = Field(..., alias="status")


class TryonJobStatusResponse(BaseModel):
    id: int
    status: TryonJobStatus
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None


class TryonJobResultResponse(BaseModel):
    id: int
    tryon_job_id: int
    result_image_url: str
    thumbnail_url: str | None
    created_at: datetime
