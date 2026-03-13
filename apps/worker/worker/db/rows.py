"""
Lightweight row mapping. dict_row yields dicts; use as_model() to map to Pydantic models.

Note: For MySQL swap, dict_row equivalent would be cursor(dictionary=True) or similar.
"""

from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def as_model(row: dict, model: type[T]) -> T:
    """Map a dict row to a Pydantic model. Keys must match model fields."""
    return model.model_validate(row)
