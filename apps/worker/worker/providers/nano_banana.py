"""
Nano Banana (Gemini) try-on provider.

Calls Google Generative Language `generateContent` endpoint with:
- person image (fitting profile) as base64 inline_data
- garment image (product) as base64 inline_data
- text prompt built from product meta

Then uploads the returned image to storage and returns a TryOnOutput.
"""

import base64
import logging
from typing import Any

import requests

from worker.core.config import settings
from worker.providers.interface import TryOnInput, TryOnOutput
from worker.storage.factory import get_storage
from worker.storage.keys import tryon_result_key

logger = logging.getLogger(__name__)

# Network timeouts for external API and image fetches
DEFAULT_TIMEOUT = 120

# Headers for fetching external images (some CDNs e.g. Zara require browser-like requests)
DEFAULT_FETCH_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}
ZARA_ORIGIN = "https://www.zara.com"


def build_tryon_prompt(
    *,
    product_title: str | None = None,
    product_brand: str | None = None,
    product_category: str | None = None,
) -> str:
    """
    Build a virtual try-on prompt from parsed Zara product data.
    Instructs the model to replace only the garment region that matches the item,
    with full structural change (not texture transfer), and to leave all other
    clothing and the person/background unchanged.
    """
    brand = (product_brand or "ZARA").strip().upper()
    title = (product_title or "the garment").strip()
    category = (product_category or "clothing").strip()

    parts = [
        "Identity lock has higher priority than garment fidelity. If conflict occurs, preserve identity exactly and reduce garment transformation.",
        f"[Task] Virtual try-on: Replace ONLY the {category} on the person with the {brand} {title}.",
        "[Garment Rules] Use the item image as the ABSOLUTE source of truth for shape, cut, and texture. Fully replace the old garment structure to match the item image exactly in silhouette and construction. When the new garment exposes more skin (e.g., short sleeves, shorts, shorter skirt), remove the old garment in those areas and render bare skin that matches the person's original skin tone. No overlay of the old garment is allowed, and no color bleed from the original garment is allowed.",
        "Do not add or invent distressing, rips, tears, holes, fraying, whiskering, fades, or stains that are not clearly visible in the garment reference image. Only reproduce distressing that is visually present in the garment image. If the garment image shows no visible rips or tears, the output garment must have zero rips or tears — regardless of what the product title or description says. Treat the garment reference image as the single source of truth for surface details.",
        "Match the garment's color, wash, and material appearance to the garment reference image as closely as possible (hue, saturation, value). The final garment color must override and replace the original clothing color in the edited region. Do not recolor, apply filters, add cinematic grading, or change the lighting style. Keep the overall photo exposure and white balance consistent with the original person photo. No stylization.",
        "[Identity Preservation - CRITICAL] PROTECT IDENTITY: The person's face, features, hair, and body proportions must remain 100% IDENTICAL to the source photo. The person image is the only identity source. The garment image is only a clothing reference; do not copy or blend any face, skin, hair, body, or pose cues from the garment image model. Do not edit, regenerate, beautify, or alter the face in any way. No face-swapping, no skin smoothing, no de-aging, no makeup changes, and no alteration of facial geometry. Keep the original background, lighting, and pose unchanged. Only the pixels corresponding to the target garment area and newly exposed skin may be modified. Hands and fingers must remain anatomically correct and unchanged except where necessarily occluded by the new garment.",
    ]

    return " ".join(parts)


class NanoBananaProvider:
    """
    Try-on provider that calls Nano Banana / Gemini-style API with a Zara product–based prompt.
    Expects API to accept prompt + person image + garment image and return a result image.
    """

    def __init__(self, *, job_id: int | None = None):
        self.job_id = job_id

    def generate(self, input: TryOnInput) -> TryOnOutput:
        """Run try-on: build prompt from product meta, call API, return result (upload to storage if needed)."""
        url = (settings.nano_banana_api_url or "").strip()
        key = (settings.nano_banana_api_key or "").strip()
        if not url:
            raise ValueError("NANO_BANANA_API_URL is not set")
        if not key:
            raise ValueError("NANO_BANANA_API_KEY is not set")

        prompt = build_tryon_prompt(
            product_title=input.product_title,
            product_brand=input.product_brand,
            product_category=input.product_category,
        )
        person_url = (
            input.person_image_url
            if input.person_image_url
            else input.fitting_profile.front_image_url
        )
        garment_url = input.product_image_url

        # Fetch images and encode as base64 inline_data per Gemini docs.
        person_b64, person_mime = _fetch_and_b64(person_url)
        garment_b64, garment_mime = _fetch_and_b64(garment_url)

        body: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": person_mime,
                                "data": person_b64,
                            }
                        },
                        {
                            "inline_data": {
                                "mime_type": garment_mime,
                                "data": garment_b64,
                            }
                        },
                        {"text": prompt},
                    ],
                }
            ]
        }
        # Gemini HTTP API: key via query param (?key=...), JSON body only.
        params = {"key": key}
        headers = {"Content-Type": "application/json"}

        try:
            resp = requests.post(
                url,
                params=params,
                json=body,
                headers=headers,
                timeout=DEFAULT_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            # Avoid logging huge base64 blobs; log only a lightweight summary.
            if isinstance(data, dict):
                summary = {
                    "type": "dict",
                    "keys": sorted(list(data.keys())),
                    "has_candidates": "candidates" in data,
                }
            elif isinstance(data, list):
                # Inspect the first element to understand structure without dumping base64.
                elem = data[0] if data else None
                if isinstance(elem, dict):
                    candidates = elem.get("candidates") or []
                    first_cand = candidates[0] if candidates else None
                    if isinstance(first_cand, dict):
                        content = first_cand.get("content")
                    else:
                        content = None
                    # content can be dict or list; normalise to list of dicts for summary
                    contents: list[dict] = []
                    if isinstance(content, dict):
                        contents = [content]
                    elif isinstance(content, list):
                        contents = [c for c in content if isinstance(c, dict)]
                    first_parts = contents[0].get("parts") if contents else None
                    parts_list = first_parts if isinstance(first_parts, list) else []
                    first_part = parts_list[0] if parts_list else None
                    inline_type = None
                    if isinstance(first_part, dict):
                        inline = first_part.get("inline_data") or first_part.get("inlineData")
                        if isinstance(inline, dict):
                            # We only care about shape, not the actual data bytes.
                            inline_type = {
                                "keys": sorted(list(inline.keys())),
                            }
                    summary = {
                        "type": "list",
                        "length": len(data),
                        "elem0_keys": sorted(list(elem.keys())),
                        "candidates_len": len(candidates),
                        "has_content": bool(content),
                        "first_content_keys": sorted(list(contents[0].keys())) if contents else [],
                        "first_parts_len": len(parts_list),
                        "first_part_keys": sorted(list(first_part.keys())) if isinstance(first_part, dict) else [],
                        "first_inline_summary": inline_type,
                    }
                else:
                    summary = {
                        "type": "list",
                        "length": len(data),
                        "elem0_type": type(elem).__name__,
                    }
            else:
                summary = {"type": type(data).__name__}
            logger.info("Nano Banana raw response summary: %s", summary)
        except requests.RequestException as e:
            logger.exception("Nano Banana API request failed")
            raise RuntimeError(f"Nano Banana API error: {e!s}") from e

        result_url = _extract_result_url(data)
        logger.info("Nano Banana parsed result_url present: %s", bool(result_url))
        if result_url:
            # Provider gave us a URL it controls (e.g. its own CDN). We keep this
            # in the output so the API can decide whether to proxy or use it
            # directly, but we do not upload to our own S3 here.
            meta = data
            if isinstance(meta, list):
                meta = meta[0] if meta else {}
            if not isinstance(meta, dict):
                meta = {}
            return TryOnOutput(
                result_image_url=result_url,
                thumbnail_url=meta.get("thumbnail_url"),
                provider="nano_banana",
                metadata={"mode": input.mode},
            )

        # Fallback: response contains base64 image; keep it inline so the worker/API
        # can store it in a temporary cache instead of uploading to S3.
        raw = _extract_image_base64(data)
        logger.info(
            "Nano Banana parsed inline image_base64 bytes present: %s",
            bool(raw),
        )
        if raw:
            image_b64 = base64.b64encode(raw).decode("utf-8")
            meta = data
            if isinstance(meta, list):
                meta = meta[0] if meta else {}
            if not isinstance(meta, dict):
                meta = {}
            thumb_b64_inline = meta.get("thumbnail_base64")
            return TryOnOutput(
                result_image_url=None,
                thumbnail_url=None,
                provider="nano_banana",
                metadata={"mode": input.mode},
                inline_image_base64=image_b64,
                inline_thumbnail_base64=thumb_b64_inline,
                mime_type="image/jpeg",
            )

        raise ValueError("Nano Banana API response had no result_image_url or image_base64")


def _extract_result_url(data: dict | list) -> str | None:
    """Get result_image_url from API response.

    Some providers wrap the payload in a top-level list, e.g. [ { ... } ].
    Normalise that so callers can pass either dict or list.
    """
    if isinstance(data, list):
        if not data:
            return None
        data = data[0]
    if not isinstance(data, dict):
        return None
    return data.get("result_image_url") or data.get("image_url")


def _extract_image_base64(data: dict | list) -> bytes | None:
    """Decode image_base64 from API response.

    Supports:
    - Generic { "image_base64": "..." } or { "result_image_base64": "..." }
    - Gemini-style { "candidates": [ { "content": { "parts": [ { "inline_data": { "data": "..." } } ] } } ] }
    """
    # Some providers return a top-level list like [ { ... } ]
    if isinstance(data, list):
        if not data:
            return None
        data = data[0]
    if not isinstance(data, dict):
        return None

    # Simple formats first
    b64 = data.get("image_base64") or data.get("result_image_base64")
    if not b64:
        b64 = _extract_gemini_image_base64(data)
    if not b64:
        return None
    try:
        return base64.b64decode(b64)
    except Exception:
        return None


def _extract_gemini_image_base64(data: dict | list) -> str | None:
    """Extract image base64 from Gemini generateContent-style responses.

    The Nano Banana / Gemini client libraries sometimes wrap the payload in
    slightly different shapes, for example:

    - {"candidates": [{"content": {"parts": [{"inline_data": {"data": "..."}}]}}]}
    - {"candidates": [{"content": [{"parts": [{"inlineData": {"data": "..."}}]}]}]}
    - or deeper/nested variants when using preview/image models.

    We therefore:
    1. Normalise an optional top-level list (e.g. [ {...} ]).
    2. Walk candidates → content → parts.
    3. Fall back to a generic recursive search for any inline_data/inlineData.
    """

    def _find_inline_data(node: object) -> str | None:
        """Depth-first search for an inline_data/inlineData.data string."""
        if isinstance(node, dict):
            # Direct inline_data / inlineData node
            inline = None
            if "inline_data" in node or "inlineData" in node:
                inline = node.get("inline_data") or node.get("inlineData")
                if isinstance(inline, dict):
                    data_val = inline.get("data")
                    if isinstance(data_val, str):
                        return data_val
            # Recurse into values
            for value in node.values():
                found = _find_inline_data(value)
                if found:
                    return found
        elif isinstance(node, list):
            for item in node:
                found = _find_inline_data(item)
                if found:
                    return found
        return None

    # Handle optional top-level list
    if isinstance(data, list):
        if not data:
            return None
        data = data[0]
    if not isinstance(data, dict):
        return None

    # Preferred path: walk candidates/content/parts where present.
    try:
        candidates = data.get("candidates") or []
        for cand in candidates:
            if not isinstance(cand, dict):
                continue
            content = cand.get("content") or []
            # Some clients use a dict for "content", others a list.
            if isinstance(content, dict):
                contents = [content]
            elif isinstance(content, list):
                contents = [c for c in content if isinstance(c, dict)]
            else:
                contents = []

            for c in contents:
                parts = c.get("parts") or []
                for part in parts:
                    if not isinstance(part, dict):
                        continue
                    inline = (
                        part.get("inline_data")
                        or part.get("inlineData")
                        or {}
                    )
                    if isinstance(inline, dict) and isinstance(
                        inline.get("data"), str
                    ):
                        return inline["data"]
    except Exception:
        # Fall through to generic search below.
        pass

    # Fallback: generic recursive search for any inline_data/inlineData node.
    return _find_inline_data(data)


def _fetch_and_b64(url: str) -> tuple[str, str]:
    """Download image and return (base64_string, mime_type)."""
    headers = dict(DEFAULT_FETCH_HEADERS)
    if "zara" in url.lower():
        headers["Referer"] = f"{ZARA_ORIGIN}/"
    try:
        resp = requests.get(url, timeout=DEFAULT_TIMEOUT, headers=headers)
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.exception("Failed to fetch image for Nano Banana: %s", url)
        raise RuntimeError(f"Failed to fetch image: {e!s}") from e

    content_type = resp.headers.get("Content-Type") or "image/jpeg"
    b64 = base64.b64encode(resp.content).decode("utf-8")
    return b64, content_type
