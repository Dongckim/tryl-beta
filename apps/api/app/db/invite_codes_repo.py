"""Invite codes repository. Seed codes and per-user codes."""

import secrets

from app.db.connection import get_connection, with_transaction

# Avoid ambiguous chars: 0,O,1,I,L. 32 chars.
_INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
_INVITE_PREFIX = "TRYL-"
_INVITE_SUFFIX_LEN = 6
_MAX_COLLISION_RETRIES = 5


def get_by_code(code: str) -> dict | None:
    """Get invite code row by code. Normalize: strip, upper."""
    normalized = (code or "").strip().upper()
    if not normalized:
        return None
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, code, created_by_user_id, is_seed, is_active, expires_at, created_at
                FROM invite_codes
                WHERE code = %s
                """,
                (normalized,),
            )
            return cur.fetchone()


def validate_code(code: str) -> tuple[bool, int | None]:
    """
    Check code exists, is_active, not expired.
    Returns (ok, referrer_user_id). referrer_user_id is None for seed codes.
    """
    row = get_by_code(code)
    if row is None:
        return False, None
    if not row.get("is_active"):
        return False, None
    expires_at = row.get("expires_at")
    if expires_at is not None:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        if exp <= now:
            return False, None
    ref = row.get("created_by_user_id")
    return True, int(ref) if ref is not None else None


def generate_unique_code() -> str:
    """Generate TRYL-XXXXXX unique code. Raises if cannot get unique after retries."""
    for _ in range(_MAX_COLLISION_RETRIES):
        suffix = "".join(secrets.choice(_INVITE_ALPHABET) for _ in range(_INVITE_SUFFIX_LEN))
        candidate = _INVITE_PREFIX + suffix
        if get_by_code(candidate) is None:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1 FROM users WHERE invite_code = %s", (candidate,))
                    if cur.fetchone() is None:
                        return candidate
    raise RuntimeError("Could not generate unique invite code")


def create_for_user(user_id: int, code: str) -> None:
    """Insert invite_codes row for a user (their personal code)."""
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO invite_codes (code, created_by_user_id, is_seed, is_active)
                VALUES (%s, %s, false, true)
                """,
                (code, user_id),
            )


def create_seed(code: str, expires_at=None) -> None:
    """Insert a seed invite code (no user)."""
    normalized = (code or "").strip().upper()
    if not normalized:
        raise ValueError("Seed code required")
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO invite_codes (code, created_by_user_id, is_seed, is_active, expires_at)
                VALUES (%s, NULL, true, true, %s)
                ON CONFLICT (code) DO NOTHING
                """,
                (normalized, expires_at),
            )
