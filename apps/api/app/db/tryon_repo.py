"""Try-on job and result repository. Raw SQL, returns plain dicts."""

from datetime import datetime

from psycopg.types.json import Jsonb

from app.db.connection import get_connection, with_transaction

_JOB_PROJECTION = """
    id, user_id, product_id, fitting_profile_version_id, status,
    provider, cache_key, error_message, created_at, completed_at,
    override_product_image_url, profile_photo_index
"""

_RESULT_PROJECTION = """
    id, tryon_job_id, result_image_url, thumbnail_url, product_image_url, metadata_json, created_at
"""


def create_tryon_job(
    user_id: int,
    product_id: int,
    fitting_profile_version_id: int,
    *,
    override_product_image_url: str | None = None,
    profile_photo_index: int = 1,
) -> dict:
    """Create a try-on job with status 'queued'. Returns the created row. profile_photo_index: 1=front, 2=side."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO tryon_jobs (
                    user_id,
                    product_id,
                    fitting_profile_version_id,
                    status,
                    override_product_image_url,
                    profile_photo_index
                )
                VALUES (%s, %s, %s, 'queued', %s, %s)
                RETURNING {_JOB_PROJECTION}
                """,
                (user_id, product_id, fitting_profile_version_id, override_product_image_url, profile_photo_index),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_tryon_job_by_id(job_id: int) -> dict | None:
    """Get try-on job by id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_JOB_PROJECTION}
                FROM tryon_jobs
                WHERE id = %s
                """,
                (job_id,),
            )
            return cur.fetchone()


def count_tryon_jobs_by_user(user_id: int) -> int:
    """Count try-on jobs created by this user (all-time). Used for beta per-account limit."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS count FROM tryon_jobs WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            if not row:
                return 0
            # row_factory=dict_row returns a dict, so access by column name
            count = row.get("count")
            return int(count) if count is not None else 0


def get_tryon_result_by_id(result_id: int) -> dict | None:
    """Get try-on result by id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_RESULT_PROJECTION}
                FROM tryon_results
                WHERE id = %s
                """,
                (result_id,),
            )
            return cur.fetchone()


def get_tryon_result_by_job_id(job_id: int) -> dict | None:
    """Get try-on result by job id. Returns None if no result yet."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {_RESULT_PROJECTION}
                FROM tryon_results
                WHERE tryon_job_id = %s
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
                RETURNING {_JOB_PROJECTION}
                """,
                params,
            )
            return cur.fetchone()


def create_tryon_result(
    tryon_job_id: int,
    result_image_url: str,
    *,
    thumbnail_url: str | None = None,
    product_image_url: str | None = None,
    metadata_json: dict | None = None,
) -> dict:
    """Create a try-on result. Returns the created row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO tryon_results (tryon_job_id, result_image_url, thumbnail_url, product_image_url, metadata_json)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING {_RESULT_PROJECTION}
                """,
                (
                    tryon_job_id,
                    result_image_url,
                    thumbnail_url,
                    product_image_url,
                    Jsonb(metadata_json) if metadata_json is not None else None,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            return row
