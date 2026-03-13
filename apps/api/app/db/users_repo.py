"""Users repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction

_COLS = "id, email, password_hash, created_at"


def get_user_by_email(email: str) -> dict | None:
    """Get user by email."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_COLS} FROM users WHERE email = %s",
                (email,),
            )
            return cur.fetchone()


def create_user(email: str, password_hash: str) -> dict:
    """Create user with password. Fails if email exists."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO users (email, password_hash)
                VALUES (%s, %s)
                RETURNING {_COLS}
                """,
                (email, password_hash),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_or_create_user(email: str) -> dict:
    """Get user by email, or create if missing (no password). For legacy flows."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_COLS} FROM users WHERE email = %s",
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
