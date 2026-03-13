"""Profile schemas."""

from pydantic import BaseModel, Field

from app.schemas.common import FitPreference


class ProfileCreate(BaseModel):
    height_cm: float = Field(..., ge=50, le=250)
    weight_kg: float | None = Field(None, ge=30, le=300)
    fit_preference: FitPreference


class ProfileUpdate(BaseModel):
    height_cm: float | None = Field(None, ge=50, le=250)
    weight_kg: float | None = Field(None, ge=30, le=300)
    fit_preference: FitPreference | None = None
    default_profile_version_id: int | None = None


class DefaultVersionSet(BaseModel):
    """Request body for PATCH /profiles/me/default-version."""

    version_id: int
