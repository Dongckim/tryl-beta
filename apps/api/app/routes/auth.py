"""Auth routes."""

from fastapi import APIRouter, Request, HTTPException, Depends

from app.core.dependencies import get_current_user
from app.core.rate_limit import rate_limit
from app.db import users_repo
from app.schemas.auth import (
    AuthResponse,
    AuthUser,
    ResendVerificationRequest,
    ResendVerificationResponse,
    SignInRequest,
    SignUpRequest,
    SignUpResponse,
    VerifyEmailRequest,
)
from app.services.auth_service import get_me_response, resend_verification, sign_in, sign_up, verify_email_code

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=AuthUser)
def get_me(current: dict = Depends(get_current_user)) -> AuthUser:
    """Return current user with invite_code and referral_count. Requires Bearer token."""
    user = users_repo.get_user_by_email(current["email"])
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return AuthUser(**get_me_response(user))


@router.post("/sign-in", response_model=AuthResponse)
def post_sign_in(body: SignInRequest, _rl=Depends(rate_limit(max_calls=10, window=60))) -> AuthResponse:
    """Sign in with email and password. Requires email_verified=true."""
    try:
        result = sign_in(body.email, body.password)
        return AuthResponse(**result)
    except ValueError as e:
        code = str(e)
        if code == "email_not_verified":
            raise HTTPException(status_code=403, detail=code)
        raise HTTPException(status_code=401, detail=code)


@router.post("/sign-up", response_model=SignUpResponse)
def post_sign_up(body: SignUpRequest, _rl=Depends(rate_limit(max_calls=10, window=3600))) -> SignUpResponse:
    """Start sign-up. Creates user (unverified), sends 6-digit code to email."""
    try:
        result = sign_up(
            invite_code=body.invite_code,
            first_name=body.first_name,
            last_name=body.last_name,
            email=body.email,
            password=body.password,
            age=body.age,
            sex=body.sex,
        )
        return SignUpResponse(**result)
    except ValueError as e:
        code = str(e)
        status = 400
        if code == "email_already_in_use":
            status = 409
        raise HTTPException(status_code=status, detail=code)


@router.post("/verify-email-code", response_model=AuthResponse)
def post_verify_email_code(body: VerifyEmailRequest) -> AuthResponse:
    """Verify 6-digit code, set email_verified=true, return token (auto login)."""
    try:
        result = verify_email_code(body.email, body.code)
        return AuthResponse(**result)
    except ValueError as e:
        code = str(e)
        status = 400
        raise HTTPException(status_code=status, detail=code)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
def post_resend_verification(body: ResendVerificationRequest) -> ResendVerificationResponse:
    """Send a new verification code. 60s cooldown per email."""
    try:
        resend_verification(body.email)
        return ResendVerificationResponse()
    except ValueError as e:
        code = str(e)
        status = 400
        if code == "verification_resend_too_soon":
            status = 429
        raise HTTPException(status_code=status, detail=code)
