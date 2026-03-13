"""Worker settings. Load from env; .env supported."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://localhost/tryl"
    redis_url: str = "redis://localhost:6379/0"
    queue_name: str = "tryon:jobs"
    tryon_provider: str = "mock"  # mock | nano_banana

    # Storage (local | s3). Local is dev default; S3 for real URLs.
    storage_backend: str = "local"
    storage_base_path: str = "./storage"
    storage_base_url: str = "https://storage.tryl.local"
    s3_bucket: str = ""
    s3_region: str = "us-east-2"
    s3_base_url: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    # Nano Banana try-on API (env: NANO_BANANA_API_URL, NANO_BANANA_API_KEY)
    nano_banana_api_url: str = ""
    nano_banana_api_key: str = ""

    # Reliability / networking policy
    # - fetch_timeout_seconds: image fetch timeout
    # - provider_timeout_seconds: provider API timeout
    # - retry_attempts: total attempts (1 = no retry)
    # - retry_backoff_seconds: base backoff delay between retries (exponential)
    fetch_timeout_seconds: int = 20
    provider_timeout_seconds: int = 120
    retry_attempts: int = 2
    retry_backoff_seconds: float = 1.0

    # TTL (seconds) for temporary try-on results stored in Redis.
    # After this expires, users will no longer be able to view the
    # ephemeral result unless it has been promoted to a saved look.
    temp_result_ttl_seconds: int = 60 * 60  # 1 hour


settings = Settings()
