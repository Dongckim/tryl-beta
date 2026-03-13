"""Saved look schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SaveLookRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    # Legacy: save by existing tryon_result id (e.g. from web app).
    tryon_result_id: int | None = Field(default=None, alias="tryonResultId")
    # Extension: save directly from a completed job id (Redis temp → S3).
    job_id: int | None = Field(default=None, alias="jobId")
    note: str | None = None


class SavedLookResponse(BaseModel):
    id: int
    tryon_result_id: int
    note: str | None
    created_at: datetime
    result_image_url: str
    thumbnail_url: str | None
    product_image_url: str | None = None
    product_title: str | None = None
    product_url: str | None = None
    product_price: str | None = None
    pinned: bool = False
    pinned_slot: int | None = None