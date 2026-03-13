"""Saved look repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction


def save_look(
    user_id: int,
    tryon_result_id: int,
    note: str | None = None,
) -> dict:
    """
    Save a look (bookmark a try-on result).
    On conflict (user_id, tryon_result_id), updates note. Returns the row.
    """
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO saved_looks (user_id, tryon_result_id, note)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, tryon_result_id)
                DO UPDATE SET note = COALESCE(EXCLUDED.note, saved_looks.note)
                RETURNING id, user_id, tryon_result_id, note, created_at
                """,
                (user_id, tryon_result_id, note),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def list_looks_by_user(user_id: int) -> list[dict]:
    """
    List saved looks for a user, newest first.
    Joins with tryon_results, tryon_jobs, products for images and product title/url.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.user_id, s.tryon_result_id, s.note, s.created_at,
                       r.result_image_url, r.thumbnail_url, r.product_image_url,
                       p.title AS product_title, p.source_url AS product_url, p.price_text AS product_price,
                       CASE WHEN pl.saved_look_id IS NULL THEN false ELSE true END AS pinned,
                       pl.slot AS pinned_slot
                FROM saved_looks s
                JOIN tryon_results r ON r.id = s.tryon_result_id
                JOIN tryon_jobs j ON j.id = r.tryon_job_id
                JOIN products p ON p.id = j.product_id
                LEFT JOIN pinned_looks pl ON pl.user_id = s.user_id AND pl.saved_look_id = s.id
                WHERE s.user_id = %s
                ORDER BY s.created_at DESC
                """,
                (user_id,),
            )
            return cur.fetchall()


def list_looks_by_user_page(user_id: int, limit: int, offset: int) -> list[dict]:
    """
    List saved looks for a user, newest first, with pagination.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.user_id, s.tryon_result_id, s.note, s.created_at,
                       r.result_image_url, r.thumbnail_url, r.product_image_url,
                       p.title AS product_title, p.source_url AS product_url, p.price_text AS product_price,
                       CASE WHEN pl.saved_look_id IS NULL THEN false ELSE true END AS pinned,
                       pl.slot AS pinned_slot
                FROM saved_looks s
                JOIN tryon_results r ON r.id = s.tryon_result_id
                JOIN tryon_jobs j ON j.id = r.tryon_job_id
                JOIN products p ON p.id = j.product_id
                LEFT JOIN pinned_looks pl ON pl.user_id = s.user_id AND pl.saved_look_id = s.id
                WHERE s.user_id = %s
                ORDER BY s.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, limit, offset),
            )
            return cur.fetchall()


def list_pinned_looks(user_id: int) -> list[dict]:
    """
    List pinned looks for a user, ordered by slot ASC.
    Returns the same shape as list_looks, plus pinned_slot.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.id, s.user_id, s.tryon_result_id, s.note, s.created_at,
                       r.result_image_url, r.thumbnail_url, r.product_image_url,
                       p.title AS product_title, p.source_url AS product_url, p.price_text AS product_price,
                       true AS pinned,
                       pl.slot AS pinned_slot
                FROM pinned_looks pl
                JOIN saved_looks s ON s.id = pl.saved_look_id AND s.user_id = pl.user_id
                JOIN tryon_results r ON r.id = s.tryon_result_id
                JOIN tryon_jobs j ON j.id = r.tryon_job_id
                JOIN products p ON p.id = j.product_id
                WHERE pl.user_id = %s
                ORDER BY pl.slot ASC
                """,
                (user_id,),
            )
            return cur.fetchall()
