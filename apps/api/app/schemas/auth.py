"""Auth schemas."""

from pydantic import BaseModel, EmailStr, Field


class SignInRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)


class AuthUser(BaseModel):
    id: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    user: AuthUser
