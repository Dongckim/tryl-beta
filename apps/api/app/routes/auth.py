"""Auth routes."""

from fastapi import APIRouter, HTTPException

from app.schemas.auth import AuthResponse, SignInRequest, SignUpRequest
from app.services.auth_service import sign_in, sign_up

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sign-in", response_model=AuthResponse)
def post_sign_in(body: SignInRequest) -> AuthResponse:
    """Sign in with email and password."""
    result = sign_in(body.email, body.password)
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return AuthResponse(**result)


@router.post("/sign-up", response_model=AuthResponse)
def post_sign_up(body: SignUpRequest) -> AuthResponse:
    """Sign up with email and password."""
    result = sign_up(body.email, body.password)
    if result is None:
        raise HTTPException(status_code=400, detail="Email already registered")
    return AuthResponse(**result)
