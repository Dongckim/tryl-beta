"""Product schemas."""

from pydantic import BaseModel, ConfigDict, Field


class ProductResolveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    source_site: str = Field(..., alias="sourceSite")
    source_url: str = Field(..., alias="sourceUrl")
    title: str
    image_url: str = Field(..., alias="imageUrl")
    price_text: str | None = Field(None, alias="priceText")
    brand: str | None = None
    category_hint: str | None = Field(None, alias="categoryHint")


class ProductResolveResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    product_id: int = Field(..., alias="productId")
    source_site: str = Field(..., alias="sourceSite")
    title: str
    category: str | None = None
    canonical_image_url: str = Field(..., alias="canonicalImageUrl")
