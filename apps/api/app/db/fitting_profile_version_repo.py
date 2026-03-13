"""Fitting profile version repository. Raw SQL, returns plain dicts."""

from psycopg.types.json import Jsonb

from app.db.connection import get_connection, with_transaction


def create_fitting_profile_version(
    user_profile_id: int,
    front_image_url: str,
    side_image_url: str,
    *,
    back_image_url: str | None = None,
    front_mask_url: str | None = None,
    side_mask_url: str | None = None,
    front_pose_json: dict | None = None,
    side_pose_json: dict | None = None,
    quality_score: float | None = None,
    is_active: bool = True,
) -> dict:
    """Create a fitting profile version. Returns the created row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO fitting_profile_versions (
                    user_profile_id, front_image_url, side_image_url,
                    back_image_url, front_mask_url, side_mask_url,
                    front_pose_json, side_pose_json, quality_score, is_active
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, user_profile_id, front_image_url, side_image_url,
                          back_image_url, front_mask_url, side_mask_url,
                          front_pose_json, side_pose_json, quality_score,
                          is_active, created_at
                """,
                (
                    user_profile_id,
                    front_image_url,
                    side_image_url,
                    back_image_url,
                    front_mask_url,
                    side_mask_url,
                    Jsonb(front_pose_json) if front_pose_json is not None else None,
                    Jsonb(side_pose_json) if side_pose_json is not None else None,
                    quality_score,
                    is_active,
                ),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_active_fitting_profile_version(user_profile_id: int) -> dict | None:
    """
    Get the active fitting profile version (is_active = true).
    Returns the first active version by id. Only one should be active per profile.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_profile_id, front_image_url, side_image_url,
                       back_image_url, front_mask_url, side_mask_url,
                       front_pose_json, side_pose_json, quality_score,
                       is_active, created_at
                FROM fitting_profile_versions
                WHERE user_profile_id = %s AND is_active = true
                ORDER BY id DESC
                LIMIT 1
                """,
                (user_profile_id,),
            )
            return cur.fetchone()


def get_default_fitting_profile_version(user_profile_id: int) -> dict | None:
    """
    Get the default fitting profile version for a profile.
    Uses user_profiles.default_profile_version_id. Returns None if not set.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.id, f.user_profile_id, f.front_image_url, f.side_image_url,
                       f.back_image_url, f.front_mask_url, f.side_mask_url,
                       f.front_pose_json, f.side_pose_json, f.quality_score,
                       f.is_active, f.created_at
                FROM fitting_profile_versions f
                JOIN user_profiles p ON p.default_profile_version_id = f.id
                WHERE p.id = %s
                """,
                (user_profile_id,),
            )
            return cur.fetchone()


def get_fitting_profile_version_by_id(version_id: int) -> dict | None:
    """
    Get a single fitting profile version by id.
    Returns None if not found.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_profile_id, front_image_url, side_image_url,
                       back_image_url, front_mask_url, side_mask_url,
                       front_pose_json, side_pose_json, quality_score,
                       is_active, created_at
                FROM fitting_profile_versions
                WHERE id = %s
                """,
                (version_id,),
            )
            return cur.fetchone()


def list_fitting_profile_versions(user_profile_id: int) -> list[dict]:
    """List all fitting profile versions for a profile, newest first."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_profile_id, front_image_url, side_image_url,
                       back_image_url, front_mask_url, side_mask_url,
                       front_pose_json, side_pose_json, quality_score,
                       is_active, created_at
                FROM fitting_profile_versions
                WHERE user_profile_id = %s
                ORDER BY id DESC
                """,
                (user_profile_id,),
            )
            return cur.fetchall()


def get_fitting_profile_version_or_default(user_profile_id: int) -> dict | None:
    """
    Get the default version if set, otherwise the active version.
    Convenience for "the version to use" for a profile.
    """
    row = get_default_fitting_profile_version(user_profile_id)
    if row is not None:
        return row
    return get_active_fitting_profile_version(user_profile_id)


def set_default_fitting_profile_version(user_profile_id: int, version_id: int) -> bool:
    """
    Set the default fitting profile version for a profile.
    Returns True if updated, False if profile or version not found.
    """
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_profiles
                SET default_profile_version_id = %s
                WHERE id = %s
                  AND EXISTS (
                      SELECT 1 FROM fitting_profile_versions
                      WHERE id = %s AND user_profile_id = %s
                  )
                """,
                (version_id, user_profile_id, version_id, user_profile_id),
            )
            return cur.rowcount > 0
