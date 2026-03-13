"""User profile repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction


def get_profile_by_user_id(user_id: int) -> dict | None:
    """Get the first profile for a user (by id). Returns None if none exist."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, height_cm, weight_kg, fit_preference,
                       default_profile_version_id, created_at
                FROM user_profiles
                WHERE user_id = %s
                ORDER BY id ASC
                LIMIT 1
                """,
                (user_id,),
            )
            return cur.fetchone()


def get_profiles_by_user_id(user_id: int) -> list[dict]:
    """Get all profiles for a user."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, height_cm, weight_kg, fit_preference,
                       default_profile_version_id, created_at
                FROM user_profiles
                WHERE user_id = %s
                ORDER BY id ASC
                """,
                (user_id,),
            )
            return cur.fetchall()


def create_profile(
    user_id: int,
    height_cm: float,
    fit_preference: str,
    weight_kg: float | None = None,
    default_profile_version_id: int | None = None,
) -> dict:
    """Create a user profile. Returns the created row."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_profiles (user_id, height_cm, weight_kg, fit_preference, default_profile_version_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, user_id, height_cm, weight_kg, fit_preference,
                          default_profile_version_id, created_at
                """,
                (user_id, height_cm, weight_kg, fit_preference, default_profile_version_id),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def update_profile(
    profile_id: int,
    *,
    height_cm: float | None = None,
    weight_kg: float | None = None,
    fit_preference: str | None = None,
    default_profile_version_id: int | None = None,
) -> dict | None:
    """
    Update a profile. Only provided fields are updated.
    Returns the updated row, or None if profile not found.
    """
    updates: list[str] = []
    params: list[object] = []

    if height_cm is not None:
        updates.append("height_cm = %s")
        params.append(height_cm)
    if weight_kg is not None:
        updates.append("weight_kg = %s")
        params.append(weight_kg)
    if fit_preference is not None:
        updates.append("fit_preference = %s")
        params.append(fit_preference)
    if default_profile_version_id is not None:
        updates.append("default_profile_version_id = %s")
        params.append(default_profile_version_id)

    if not updates:
        return get_profile_by_id(profile_id)

    params.append(profile_id)
    set_clause = ", ".join(updates)

    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE user_profiles
                SET {set_clause}
                WHERE id = %s
                RETURNING id, user_id, height_cm, weight_kg, fit_preference,
                          default_profile_version_id, created_at
                """,
                params,
            )
            return cur.fetchone()


def get_profile_by_id(profile_id: int) -> dict | None:
    """Get a profile by id."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, height_cm, weight_kg, fit_preference,
                       default_profile_version_id, created_at
                FROM user_profiles
                WHERE id = %s
                """,
                (profile_id,),
            )
            return cur.fetchone()
