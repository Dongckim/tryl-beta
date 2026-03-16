"""Auth service. Sign-in, sign-up, email verification, JWT."""

import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.core.settings import settings
from app.db import email_verification_codes_repo, invite_codes_repo, users_repo
from app.services import email_service

# Use pbkdf2_sha256 instead of bcrypt to avoid 72-byte password limit issues.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# Verification code: 6 digits, 10 min expiry, 5 attempts, 60s resend cooldown
VERIFICATION_CODE_EXPIRE_MINUTES = 10
VERIFICATION_MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


def _normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": int(time.time()) + settings.jwt_expire_minutes * 60,
        "iat": int(time.time()),
    }
    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.InvalidTokenError:
        return None


def get_me_response(user: dict) -> dict:
    """Build AuthUser-shaped dict for /auth/me (includes referral_count)."""
    return _user_to_response(user)


def _user_to_response(user: dict) -> dict:
    referral_count = users_repo.count_referrals(user["id"])
    return {
        "id": str(user["id"]),
        "email": user["email"],
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "invite_code": user.get("invite_code"),
        "referral_count": referral_count,
    }


# --- Sign up ---


def sign_up(
    invite_code: str,
    first_name: str,
    last_name: str,
    email: str,
    password: str,
    age: int | None = None,
    sex: str | None = None,
) -> dict:
    """
    Start sign-up: validate invite code, create user (email_verified=false), send verification email.
    Returns {"verification_required": True, "email": email}.
    Raises ValueError with code: invite_code_invalid, email_already_in_use, email_not_verified.
    """
    email = _normalize_email(email)

    ok, referrer_user_id = invite_codes_repo.validate_code(invite_code)
    if not ok:
        raise ValueError("invite_code_invalid")

    existing = users_repo.get_user_by_email(email)
    if existing is not None:
        if existing.get("email_verified"):
            raise ValueError("email_already_in_use")
        raise ValueError("email_not_verified")

    # Create user
    new_code = invite_codes_repo.generate_unique_code()
    user = users_repo.create_user(
        email,
        hash_password(password),
        first_name=(first_name or "").strip() or None,
        last_name=(last_name or "").strip() or None,
        age=age,
        sex=sex,
        referrer_user_id=referrer_user_id,
        invite_code=new_code,
    )
    invite_codes_repo.create_for_user(user["id"], new_code)

    # Create verification code and send email
    code_plain = f"{secrets.randbelow(1000000):06d}"
    code_hash = hashlib.sha256(code_plain.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    email_verification_codes_repo.create(email, code_hash, expires_at)
    display_name = f"{(first_name or '').strip()} {(last_name or '').strip()}".strip() or None
    email_service.send_verification_email(email, code_plain, recipient_name=display_name)

    return {"verification_required": True, "email": email}


# --- Resend verification ---


def resend_verification(email: str) -> dict:
    """
    Send a new verification code. 60s cooldown per email.
    Returns {"sent": True}. Raises ValueError: verification_resend_too_soon, or if no unverified user.
    """
    email = _normalize_email(email)
    user = users_repo.get_user_by_email(email)
    if user is None:
        raise ValueError("email_not_verified")  # don't leak existence
    if user.get("email_verified"):
        raise ValueError("email_not_verified")

    last = email_verification_codes_repo.last_created_at(email)
    if last is not None:
        delta = (datetime.now(timezone.utc) - (last if last.tzinfo else last.replace(tzinfo=timezone.utc))).total_seconds()
        if delta < RESEND_COOLDOWN_SECONDS:
            raise ValueError("verification_resend_too_soon")

    code_plain = f"{secrets.randbelow(1000000):06d}"
    code_hash = hashlib.sha256(code_plain.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)
    email_verification_codes_repo.create(email, code_hash, expires_at)
    display_name = f"{(user.get('first_name') or '').strip()} {(user.get('last_name') or '').strip()}".strip() or None
    email_service.send_verification_email(email, code_plain, recipient_name=display_name)
    return {"sent": True}


# --- Verify email code ---


def verify_email_code(email: str, code: str) -> dict:
    """
    Verify 6-digit code, set email_verified=true, trial_remaining=20, return token.
    Returns {"access_token", "user"}. Raises ValueError: verification_code_invalid, verification_code_expired, verification_code_max_attempts_exceeded.
    """
    email = _normalize_email(email)
    user = users_repo.get_user_by_email(email)
    if user is None:
        raise ValueError("verification_code_invalid")
    if user.get("email_verified"):
        return {
            "access_token": create_access_token(user["id"], user["email"]),
            "user": _user_to_response(user),
        }

    row = email_verification_codes_repo.get_latest_unconsumed(email)
    if row is None:
        raise ValueError("verification_code_invalid")
    now = datetime.now(timezone.utc)
    exp = row["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp <= now:
        raise ValueError("verification_code_expired")
    if row["attempt_count"] >= VERIFICATION_MAX_ATTEMPTS:
        raise ValueError("verification_code_max_attempts_exceeded")

    code_hash = hashlib.sha256((code or "").strip().encode()).hexdigest()
    if code_hash != row["code_hash"]:
        email_verification_codes_repo.increment_attempt(row["id"])
        raise ValueError("verification_code_invalid")

    email_verification_codes_repo.consume(row["id"])
    users_repo.set_email_verified(user["id"], trial_remaining=20)
    # Reload user for response
    user = users_repo.get_user_by_email(email)
    assert user is not None
    return {
        "access_token": create_access_token(user["id"], user["email"]),
        "user": _user_to_response(user),
    }


# --- Sign in ---


def sign_in(email: str, password: str) -> dict:
    """
    Sign in. Returns {"access_token", "user"}.
    Raises ValueError("email_not_verified") or ValueError("invalid_credentials").
    """
    email = _normalize_email(email)
    user = users_repo.get_user_by_email(email)
    if user is None:
        raise ValueError("invalid_credentials")
    if not user.get("password_hash"):
        raise ValueError("invalid_credentials")
    if not verify_password(password, user["password_hash"]):
        raise ValueError("invalid_credentials")
    if not user.get("email_verified"):
        raise ValueError("email_not_verified")
    return {
        "access_token": create_access_token(user["id"], user["email"]),
        "user": _user_to_response(user),
    }
