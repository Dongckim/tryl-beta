"""
S3 storage backend. Uploads to AWS S3; returns public or custom-base URL for preview.
Set storage_backend=s3, s3_bucket, and optionally s3_base_url (e.g. CloudFront).
"""

import logging

import boto3
from botocore.exceptions import ClientError

from app.core.settings import settings
from app.storage.interface import Storage, StorageKey

logger = logging.getLogger(__name__)


class S3Storage:
    """Store objects in S3. Returns URL for DB/preview (S3 object URL or custom base)."""

    def __init__(
        self,
        *,
        bucket: str | None = None,
        region: str | None = None,
        base_url: str | None = None,
    ):
        self.bucket = bucket or settings.s3_bucket
        self.region = region or settings.s3_region
        self.base_url = (base_url or settings.s3_base_url or "").strip()
        if not self.bucket:
            raise ValueError("s3_bucket is required when storage_backend=s3")
        kw: dict = {"region_name": self.region}
        if (settings.aws_access_key_id or "").strip() and (settings.aws_secret_access_key or "").strip():
            kw["aws_access_key_id"] = settings.aws_access_key_id.strip()
            kw["aws_secret_access_key"] = settings.aws_secret_access_key.strip()
        self._client = boto3.client("s3", **kw)

    def put(self, key: StorageKey, data: bytes, content_type: str) -> str:
        """Upload to S3; return URL for preview (stored in DB)."""
        try:
            self._client.put_object(
                Bucket=self.bucket,
                Key=key.path,
                Body=data,
                ContentType=content_type,
            )
        except ClientError as e:
            logger.exception("S3 put_object failed")
            raise RuntimeError(f"S3 upload failed: {e!s}") from e
        return self.url_for(key)

    def url_for(self, key: StorageKey) -> str:
        """Return public URL for the object (for preview in web)."""
        if self.base_url:
            return f"{self.base_url.rstrip('/')}/{key.path}"
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key.path}"
