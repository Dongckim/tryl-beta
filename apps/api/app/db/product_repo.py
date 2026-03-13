"""Product repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction

_PROJECTION = """
    id, source_site, source_url, title, brand, category,
    price_text, image_url, canonical_hash, created_at
"""


def get_product_by_source_url(source_site: str, source_url: str) -> dict | None:
    """Get product by source_site and source_url. Returns None if not found."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_PROJECTION}
                FROM products
                WHERE source_site = %s AND source_url = %s
                """,
                (source_site, source_url),
            )
            return cur.fetchone()


def create_product(
    source_site: str,
    source_url: str,
    title: str,
    image_url: str,
    *,
    brand: str | None = None,
    category: str | None = None,
    price_text: str | None = None,
    canonical_hash: str | None = None,
) -> dict:
    """Create a product. Returns the created row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO products (source_site, source_url, title, image_url,
                                      brand, category, price_text, canonical_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {_PROJECTION}
                """,
                (
                    source_site,
                    source_url,
                    title,
                    image_url,
                    brand,
                    category,
                    price_text,
                    canonical_hash,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_or_create_product(
    source_site: str,
    source_url: str,
    title: str,
    image_url: str,
    *,
    brand: str | None = None,
    category: str | None = None,
    price_text: str | None = None,
    canonical_hash: str | None = None,
) -> dict:
    """Get product by source_site+source_url, or create if missing. Returns the row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO products (source_site, source_url, title, image_url,
                                      brand, category, price_text, canonical_hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source_site, source_url)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    image_url = EXCLUDED.image_url,
                    price_text = COALESCE(EXCLUDED.price_text, products.price_text),
                    brand = COALESCE(EXCLUDED.brand, products.brand),
                    category = COALESCE(EXCLUDED.category, products.category)
                RETURNING {_PROJECTION}
                """,
                (
                    source_site,
                    source_url,
                    title,
                    image_url,
                    brand,
                    category,
                    price_text,
                    canonical_hash,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_product_by_id(product_id: int) -> dict | None:
    """Get product by id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_PROJECTION}
                FROM products
                WHERE id = %s
                """,
                (product_id,),
            )
            return cur.fetchone()
