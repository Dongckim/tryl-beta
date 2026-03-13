"""Auth service. Sign-in, sign-up, JWT."""

import time

import jwt
from passlib.context import CryptContext

from app.core.settings import settings
from app.db import users_repo

# Use pbkdf2_sha256 instead of bcrypt to avoid 72-byte password limit issues.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


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


def sign_in(email: str, password: str) -> dict | None:
    """Sign in. Returns { access_token, user } or None."""
    user = users_repo.get_user_by_email(email)
    if user is None:
        return None
    if not user.get("password_hash"):
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return {
        "access_token": create_access_token(user["id"], user["email"]),
        "user": {"id": str(user["id"]), "email": user["email"]},
    }


def sign_up(email: str, password: str) -> dict | None:
    """Sign up. Returns { access_token, user } or None if email exists."""
    if users_repo.get_user_by_email(email) is not None:
        return None
    user = users_repo.create_user(email, hash_password(password))
    return {
        "access_token": create_access_token(user["id"], user["email"]),
        "user": {"id": str(user["id"]), "email": user["email"]},
    }
