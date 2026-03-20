"""
In-memory rate limiter for API endpoints.

Usage as a FastAPI dependency:

    @router.post("/endpoint")
    def my_endpoint(request: Request, _rl=Depends(rate_limit(max_calls=5, window=60))):
        ...
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request


def rate_limit(*, max_calls: int, window: int, by: str = "ip"):
    """
    Return a FastAPI dependency that enforces a sliding-window rate limit.

    Args:
        max_calls: Maximum number of calls allowed within the window.
        window: Window size in seconds.
        by: "ip" (default) or "user" — key to bucket requests by.
    """
    timestamps: dict[str, list[float]] = defaultdict(list)

    def _dependency(request: Request) -> None:
        if by == "user":
            # Requires auth middleware to have set state.user
            user = getattr(request.state, "user", None)
            key = str(user["id"]) if user else (request.client.host if request.client else "unknown")
        else:
            key = request.client.host if request.client else "unknown"

        now = time.time()
        cutoff = now - window
        entries = timestamps[key]
        # Prune old entries
        timestamps[key] = [t for t in entries if t > cutoff]
        if len(timestamps[key]) >= max_calls:
            raise HTTPException(status_code=429, detail="rate_limit_exceeded")
        timestamps[key].append(now)

    return _dependency
