"""Shared enums for schemas."""

from enum import Enum


class FitPreference(str, Enum):
    slim = "slim"
    regular = "regular"
    relaxed = "relaxed"
    oversized = "oversized"


class TryonJobStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"
