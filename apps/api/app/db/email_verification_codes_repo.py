"""Email verification codes repository. 6-digit codes, 10min expiry, 5 attempts."""

from app.db.connection import get_connection, with_transaction


def create(email: str, code_hash: str, expires_at) -> dict:
    """Insert a new verification code for email."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO email_verification_codes (email, code_hash, expires_at, attempt_count)
                VALUES (%s, %s, %s, 0)
                RETURNING id, email, expires_at, attempt_count, created_at
                """,
                (email, code_hash, expires_at),
            )
            row = cur.fetchone()
            assert row is not None
            return row


def get_latest_unconsumed(email: str) -> dict | None:
    """Get latest verification code for email that is not consumed and not expired."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, code_hash, expires_at, attempt_count, consumed_at, created_at
                FROM email_verification_codes
                WHERE email = %s AND consumed_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (email,),
            )
            return cur.fetchone()


def increment_attempt(code_id: int) -> None:
    """Increment attempt_count for a code."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE id = %s",
                (code_id,),
            )


def consume(code_id: int) -> None:
    """Mark code as consumed."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE email_verification_codes SET consumed_at = now() WHERE id = %s",
                (code_id,),
            )


def last_created_at(email: str) -> object | None:
    """Return created_at of most recent code for this email (for resend cooldown)."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT created_at FROM email_verification_codes
                WHERE email = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (email,),
            )
            row = cur.fetchone()
            return row["created_at"] if row else None
