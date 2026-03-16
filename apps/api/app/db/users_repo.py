"""Users repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction

_COLS = "id, email, password_hash, first_name, last_name, age, sex, email_verified, invite_code, referrer_user_id, trial_remaining, created_at"
_COLS_LEGACY = "id, email, password_hash, created_at"


def get_user_by_email(email: str) -> dict | None:
    """Get user by email (normalized lowercase)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_COLS} FROM users WHERE email = %s",
                (email,),
            )
            return cur.fetchone()


def create_user(
    email: str,
    password_hash: str,
    *,
    first_name: str | None = None,
    last_name: str | None = None,
    age: int | None = None,
    sex: str | None = None,
    referrer_user_id: int | None = None,
    invite_code: str | None = None,
) -> dict:
    """Create user with beta fields. Fails if email exists."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO users (
                    email, password_hash, first_name, last_name, age, sex,
                    email_verified, referrer_user_id, invite_code, trial_remaining
                )
                VALUES (%s, %s, %s, %s, %s, %s, false, %s, %s, 0)
                RETURNING {_COLS}
                """,
                (email, password_hash, first_name or None, last_name or None, age, sex or None, referrer_user_id, invite_code),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def count_referrals(referrer_user_id: int) -> int:
    """Number of users who signed up with this user's invite code. dict_row returns dict, use column name."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS count FROM users WHERE referrer_user_id = %s",
                (referrer_user_id,),
            )
            row = cur.fetchone()
            return int(row.get("count", 0)) if row else 0


def set_email_verified(user_id: int, trial_remaining: int = 20) -> None:
    """Set email_verified=true and trial_remaining for user."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET email_verified = true, trial_remaining = %s WHERE id = %s",
                (trial_remaining, user_id),
            )


def get_or_create_user(email: str) -> dict:
    """Get user by email, or create if missing (no password). For legacy flows."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_COLS_LEGACY} FROM users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
            if row is not None:
                return row

    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email)
                VALUES (%s)
                ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
                RETURNING id, email, password_hash, created_at
                """,
                (email,),
            )
            row = cur.fetchone()
            assert row is not None
            return row
