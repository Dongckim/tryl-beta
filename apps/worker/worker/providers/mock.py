"""Mock try-on provider. Simulates work; no external API calls."""

import time

from worker.providers.interface import TryOnInput, TryOnOutput


class MockProvider:
    """Mock provider that returns placeholder URLs after a simulated delay."""

    def __init__(self, *, job_id: int | None = None):
        self.job_id = job_id

    def generate(self, input: TryOnInput) -> TryOnOutput:
        """Simulate try-on generation."""
        time.sleep(2)
        suffix = f"_{input.mode}" if input.mode == "draft" else ""
        base = f"https://mock.tryl.local/results/{self.job_id or 0}{suffix}"
        return TryOnOutput(
            result_image_url=f"{base}.jpg",
            thumbnail_url=f"{base}_thumb.jpg",
            provider="mock",
            metadata={"mode": input.mode},
        )
