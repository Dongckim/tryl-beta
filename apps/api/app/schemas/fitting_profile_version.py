"""Fitting profile version schemas."""

from pydantic import BaseModel


class FittingProfileVersionCreate(BaseModel):
    front_image_url: str
    side_image_url: str
    back_image_url: str | None = None
    front_mask_url: str | None = None
    side_mask_url: str | None = None
