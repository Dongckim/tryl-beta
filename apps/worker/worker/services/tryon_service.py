"""
Try-on job processing service.

Loads job, profile, product; runs generation via provider; persists result.
"""

from datetime import datetime, timezone

from worker.providers import FittingProfileImages, TryOnInput, TryOnOutput
from worker.core.config import settings
from worker.providers.factory import get_provider
from worker.repositories import tryon_repo
from worker.services.temp_results import save_temp_result

MAX_ERROR_LEN = 500


def process_tryon_job(tryon_job_id: int) -> None:
    """
    Process a try-on job: claim (queued→processing), load profile/product,
    run provider, create result, mark completed. On error, marks job failed.
    """
    job = tryon_repo.claim_queued_job(tryon_job_id)
    if job is None:
        return  # Not found or already claimed

    try:
        profile = tryon_repo.get_fitting_profile_version_for_job(tryon_job_id)
        product = tryon_repo.get_product_for_job(tryon_job_id)

        if profile is None or product is None:
            _fail(tryon_job_id, "Product or fitting profile not found")
            return

        provider_input = _build_provider_input(profile, product)
        provider = get_provider(tryon_job_id)
        output = provider.generate(provider_input)

        _complete(tryon_job_id, output)
    except Exception as e:
        _fail(tryon_job_id, _format_error(e))


def _build_provider_input(profile: dict, product: dict, mode: str = "final") -> TryOnInput:
    """Build provider input from DB rows."""
    fitting_profile = FittingProfileImages(
        front_image_url=profile["front_image_url"],
        side_image_url=profile["side_image_url"],
        back_image_url=profile.get("back_image_url"),
        front_mask_url=profile.get("front_mask_url"),
        side_mask_url=profile.get("side_mask_url"),
    )
    return TryOnInput(
        fitting_profile=fitting_profile,
        product_image_url=product["image_url"],
        mode=mode,
        product_title=product.get("title"),
        product_brand=product.get("brand"),
        product_category=product.get("category"),
    )


def _complete(tryon_job_id: int, output: TryOnOutput) -> None:
    """
    Mark job completed and store result in temporary storage.

    For privacy, we no longer create a persistent tryon_results row or upload
    to our own S3 at this stage. Instead, we write the provider output to a
    Redis-backed temporary cache. The API can read from this cache to render
    the result, and only when the user saves the look do we promote it to a
    persistent tryon_results record and (optionally) S3.
    """
    metadata = output.metadata or {}
    metadata["provider"] = output.provider

    # Prefer inline/base64 data when available; otherwise fall back to provider URL.
    payload = {
        "image_base64": output.inline_image_base64,
        "thumbnail_base64": output.inline_thumbnail_base64,
        "mime_type": output.mime_type,
        "provider": output.provider,
        "metadata": metadata,
    }
    # If the provider only returned an external URL, keep that in metadata so the
    # API can decide whether to proxy or use it directly.
    if output.result_image_url:
        payload["external_url"] = output.result_image_url  # type: ignore[assignment]

    save_temp_result(
        tryon_job_id,
        payload,  # type: ignore[arg-type]
        ttl_seconds=settings.temp_result_ttl_seconds,
    )
    tryon_repo.update_tryon_job_status(
        tryon_job_id,
        "completed",
        provider=output.provider,
        completed_at=datetime.now(timezone.utc),
    )


def _fail(tryon_job_id: int, error_message: str) -> None:
    """Mark job failed with error_message."""
    tryon_repo.update_tryon_job_status(
        tryon_job_id,
        "failed",
        error_message=error_message[:MAX_ERROR_LEN],
        completed_at=datetime.now(timezone.utc),
    )


def _format_error(e: Exception) -> str:
    """
    Standardize worker error messages so API/web can display consistently.
    """
    msg = str(e) or e.__class__.__name__
    lower = msg.lower()
    if "not set" in lower and ("api_key" in lower or "api_url" in lower):
        return f"CONFIG: {msg}"
    if "timeout" in lower:
        return f"TIMEOUT: {msg}"
    if "failed to fetch image" in lower:
        return f"FETCH: {msg}"
    if "nano banana api error" in lower or "api error" in lower:
        return f"PROVIDER: {msg}"
    return f"FAILED: {msg}"
