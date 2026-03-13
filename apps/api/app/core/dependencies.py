"""FastAPI dependencies. JWT Bearer auth."""

from typing import TypedDict

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.settings import settings
from app.db import users_repo
from app.services.auth_service import decode_access_token

security = HTTPBearer(auto_error=False)


class CurrentUser(TypedDict):
    id: str
    email: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> CurrentUser:
    """Extract and verify Bearer token; return current user."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = users_repo.get_user_by_email(email)
    if user is None or str(user["id"]) != user_id:
        raise HTTPException(status_code=401, detail="User not found")
    return CurrentUser(id=user_id, email=email)
