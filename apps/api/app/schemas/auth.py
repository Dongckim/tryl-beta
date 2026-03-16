"""Auth schemas."""

from pydantic import BaseModel, EmailStr, Field


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class SignUpRequest(BaseModel):
    invite_code: str = Field(..., min_length=1)
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=8)
    age: int | None = None
    sex: str | None = None  # male | female | non_binary


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6)


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class AuthUser(BaseModel):
    id: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    invite_code: str | None = None
    referral_count: int = 0


class AuthResponse(BaseModel):
    access_token: str
    user: AuthUser


class SignUpResponse(BaseModel):
    verification_required: bool = True
    email: str


class ResendVerificationResponse(BaseModel):
    sent: bool = True
