"""
PostgreSQL connection and transaction helpers.

Uses psycopg with connection pooling. Repositories call get_connection() or
with_transaction() and execute queries directly.
"""

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.core.settings import settings

_pool: ConnectionPool | None = None


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.database_url,
            min_size=2,
            max_size=20,
            kwargs={"row_factory": dict_row},
            check=ConnectionPool.check_connection,
        )
    return _pool


@contextmanager
def get_connection() -> Generator[psycopg.Connection, None, None]:
    """Yield a pooled connection. Auto-returns to pool on exit."""
    with _get_pool().connection() as conn:
        yield conn


@contextmanager
def with_transaction() -> Generator[psycopg.Connection, None, None]:
    """
    Yield a pooled connection with an open transaction.
    Commits on success, rolls back on exception.
    """
    with _get_pool().connection() as conn:
        with conn.transaction():
            yield conn
