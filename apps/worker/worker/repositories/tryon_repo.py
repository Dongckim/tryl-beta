"""Try-on job and result repository. Raw SQL, returns plain dicts."""

from datetime import datetime

from psycopg.types.json import Jsonb

from worker.db import get_connection, with_transaction

def get_tryon_job_by_id(job_id: int) -> dict | None:
    """Get try-on job by id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, product_id, fitting_profile_version_id, status,
                       provider, cache_key, error_message, created_at, completed_at,
                       COALESCE(profile_photo_index, 1) AS profile_photo_index
                FROM tryon_jobs
                WHERE id = %s
                """,
                (job_id,),
            )
            return cur.fetchone()


def get_fitting_profile_version_for_job(job_id: int) -> dict | None:
    """Get fitting profile version for a try-on job. Returns None if job or profile not found."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT fpv.id, fpv.user_profile_id, fpv.front_image_url, fpv.side_image_url,
                       fpv.back_image_url, fpv.front_mask_url, fpv.side_mask_url,
                       fpv.front_pose_json, fpv.side_pose_json, fpv.quality_score,
                       fpv.is_active, fpv.created_at
                FROM fitting_profile_versions fpv
                JOIN tryon_jobs j ON j.fitting_profile_version_id = fpv.id
                WHERE j.id = %s
                """,
                (job_id,),
            )
            return cur.fetchone()


def get_product_for_job(job_id: int) -> dict | None:
    """Get product for a try-on job. Returns None if job or product not found."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.id,
                    p.source_site,
                    p.source_url,
                    p.title,
                    p.brand,
                    p.category,
                    p.price_text,
                    COALESCE(j.override_product_image_url, p.image_url) AS image_url,
                    p.canonical_hash,
                    p.created_at
                FROM products p
                JOIN tryon_jobs j ON j.product_id = p.id
                WHERE j.id = %s
                """,
                (job_id,),
            )
            return cur.fetchone()


def update_tryon_job_status(
    job_id: int,
    status: str,
    *,
    provider: str | None = None,
    cache_key: str | None = None,
    error_message: str | None = None,
    completed_at: datetime | None = None,
) -> dict | None:
    """
    Update try-on job status and optional fields.
    Returns the updated row, or None if job not found.
    """
    updates: list[str] = ["status = %s"]
    params: list[object] = [status]

    if provider is not None:
        updates.append("provider = %s")
        params.append(provider)
    if cache_key is not None:
        updates.append("cache_key = %s")
        params.append(cache_key)
    if error_message is not None:
        updates.append("error_message = %s")
        params.append(error_message)
    if completed_at is not None:
        updates.append("completed_at = %s")
        params.append(completed_at)

    params.append(job_id)
    set_clause = ", ".join(updates)

    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE tryon_jobs
                SET {set_clause}
                WHERE id = %s
                RETURNING id, user_id, product_id, fitting_profile_version_id, status,
                          provider, cache_key, error_message, created_at, completed_at
                """,
                params,
            )
            return cur.fetchone()


def create_tryon_result(
    tryon_job_id: int,
    result_image_url: str,
    *,
    thumbnail_url: str | None = None,
    metadata_json: dict | None = None,
) -> dict:
    """Create a try-on result. Returns the created row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tryon_results (tryon_job_id, result_image_url, thumbnail_url, metadata_json)
                VALUES (%s, %s, %s, %s)
                RETURNING id, tryon_job_id, result_image_url, thumbnail_url, metadata_json, created_at
                """,
                (
                    tryon_job_id,
                    result_image_url,
                    thumbnail_url,
                    Jsonb(metadata_json) if metadata_json is not None else None,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def claim_queued_job(job_id: int) -> dict | None:
    """
    Atomically claim a queued job by setting status to 'processing'.
    Returns the updated row if successful, None if job not found or not queued.
    """
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tryon_jobs
                SET status = 'processing'
                WHERE id = %s AND status = 'queued'
                RETURNING id, user_id, product_id, fitting_profile_version_id, status,
                          provider, cache_key, error_message, created_at, completed_at,
                          COALESCE(profile_photo_index, 1) AS profile_photo_index,
                          COALESCE(retry_count, 0) AS retry_count
                """,
                (job_id,),
            )
            return cur.fetchone()


def requeue_job_for_retry(job_id: int) -> dict | None:
    """
    Reset a processing/failed job back to 'queued' and increment retry_count.
    Returns the updated row, or None if job not found.
    """
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tryon_jobs
                SET status = 'queued',
                    retry_count = COALESCE(retry_count, 0) + 1,
                    error_message = NULL
                WHERE id = %s
                RETURNING id, retry_count
                """,
                (job_id,),
            )
            return cur.fetchone()
