"""App settings. Load from env; .env supported."""

import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    database_url: str = "postgresql://localhost/tryl"
    # In production, jwt_secret MUST be provided via environment (.env).
    # In development, a fallback value is used for convenience.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    redis_url: str | None = None
    tryon_queue_name: str = "tryon:jobs"
    # Beta: per-account try-on limit (Gemini). Set via BETA_TRYON_LIMIT env.
    beta_tryon_limit: int = 20
    storage_backend: str = "local"  # local | s3
    storage_base_path: str = "./storage"
    storage_base_url: str = "https://storage.tryl.local"
    # S3 (when storage_backend=s3). Read from .env so boto3 gets credentials.
    s3_bucket: str = ""
    s3_region: str = "us-east-2"  # Must match bucket region (e.g. us-east-2)
    s3_base_url: str = ""  # Optional: CloudFront or custom domain, e.g. https://cdn.tryl.app
    aws_access_key_id: str = ""  # .env: AWS_ACCESS_KEY_ID
    aws_secret_access_key: str = ""  # .env: AWS_SECRET_ACCESS_KEY
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    api_base_url: str = "http://localhost:8001"
    # Resend (email verification). Optional in dev; set for production.
    resend_api_key: str = ""
    email_from: str = "verify@tryl.me"
    # Sentry (error tracking). Set SENTRY_DSN in production.
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    @field_validator("jwt_secret", mode="after")
    @classmethod
    def ensure_jwt_secret(cls, v: str) -> str:
        """
        Ensure jwt_secret is set in non-development environments.

        We intentionally read APP_ENV from the process environment here to avoid
        pydantic version differences around ValidationInfo.
        """
        app_env = os.getenv("APP_ENV", "development")
        if app_env != "development" and not v:
            raise ValueError("jwt_secret must be set in production environments")
        # Provide a clearly-marked dev-only default when missing.
        return v or "dev-secret-change-me"


# Chrome extension origin: chrome-extension://<id>
CORS_ORIGIN_REGEX = r"^chrome-extension://[a-z0-9]+$"

settings = Settings()
