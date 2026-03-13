"""Product service. Resolves raw extracted products into stored records."""

from app.db import product_repo


def resolve_product(
    source_site: str,
    source_url: str,
    title: str,
    image_url: str,
    *,
    price_text: str | None = None,
    brand: str | None = None,
    category_hint: str | None = None,
) -> dict:
    """
    Resolve a raw extracted product into a stored record.
    Returns existing product if found, otherwise creates one.
    Returns normalized shape: productId, sourceSite, title, category, canonicalImageUrl.
    """
    row = product_repo.get_or_create_product(
        source_site=source_site,
        source_url=source_url,
        title=title,
        image_url=image_url,
        price_text=price_text,
        brand=brand,
        category=category_hint,
    )
    return {
        "productId": row["id"],
        "sourceSite": row["source_site"],
        "title": row["title"],
        "category": row["category"],
        "canonicalImageUrl": row["image_url"],
    }
