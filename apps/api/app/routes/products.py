"""Product routes."""

from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.product import ProductResolveRequest, ProductResolveResponse
from app.services.product_service import resolve_product

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/resolve", response_model=ProductResolveResponse)
def resolve(
    body: ProductResolveRequest,
    user: CurrentUser = Depends(get_current_user),
) -> ProductResolveResponse:
    """Resolve a raw extracted product into a stored record. Returns existing if found."""
    result = resolve_product(
        source_site=body.source_site,
        source_url=body.source_url,
        title=body.title,
        image_url=body.image_url,
        price_text=body.price_text,
        brand=body.brand,
        category_hint=body.category_hint,
    )
    return ProductResolveResponse.model_validate(result)
