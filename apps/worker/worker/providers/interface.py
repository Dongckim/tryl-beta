"""Try-on provider interface. Define input/output and protocol."""

from dataclasses import dataclass
from typing import Literal, Protocol


GenerationMode = Literal["draft", "final"]


@dataclass(frozen=True)
class FittingProfileImages:
    """Fitting profile image references."""

    front_image_url: str
    side_image_url: str
    back_image_url: str | None = None
    front_mask_url: str | None = None
    side_mask_url: str | None = None


@dataclass(frozen=True)
class TryOnInput:
    """Input for try-on generation."""

    fitting_profile: FittingProfileImages
    product_image_url: str
    mode: GenerationMode = "final"
    # From parsed Zara product (for prompt)
    product_title: str | None = None
    product_brand: str | None = None
    product_category: str | None = None


@dataclass(frozen=True)
class TryOnOutput:
    """Structured result from try-on generation."""

    # When the provider returns a URL we can use directly (e.g. its own CDN).
    # This should NOT be our own S3 URL in the new flow; we only upload to S3
    # when the user explicitly saves a look.
    result_image_url: str | None = None
    thumbnail_url: str | None = None
    provider: str = ""
    metadata: dict | None = None

    # Optional inline data for privacy-friendly flows. Providers that return
    # raw image bytes/base64 can populate these so the worker/API can store
    # the result in a temporary cache (e.g. Redis) instead of S3.
    inline_image_base64: str | None = None
    inline_thumbnail_base64: str | None = None
    mime_type: str = "image/jpeg"


class TryOnProvider(Protocol):
    """Protocol for try-on generation providers."""

    def generate(self, input: TryOnInput) -> TryOnOutput:
        """Run try-on generation. Returns structured result."""
        ...
