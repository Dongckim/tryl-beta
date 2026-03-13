"""Upload routes (product images from extension, etc.)."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.core.dependencies import CurrentUser, get_current_user
from app.storage.factory import get_storage
from app.storage.keys import product_image_upload_key


router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/product-image")
async def upload_product_image(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """
    Receive a product image file from the extension, upload to storage (e.g. S3),
    and return its public URL.
    """
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or "image/jpeg"
    # Infer extension from content-type if possible
    ext = "jpg"
    if content_type.endswith("/png"):
        ext = "png"
    elif content_type.endswith("/webp"):
        ext = "webp"

    storage = get_storage()
    key = product_image_upload_key(int(user["id"]), ext=ext)
    url = storage.put(key, data, content_type)
    return {"url": url}

