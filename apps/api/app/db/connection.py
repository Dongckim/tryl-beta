"""
PostgreSQL connection and transaction helpers.

Uses psycopg with raw SQL. Repositories call get_connection() or with_transaction()
and execute queries directly.

Note: To swap to MySQL later, replace psycopg with mysql-connector-python or PyMySQL.
Keep SQL dialect-agnostic where possible (standard SQL, avoid PG-specific features).
"""

from contextlib import contextmanager
from typing import Generator

import psycopg
from psycopg.rows import dict_row

from app.core.settings import settings


@contextmanager
def get_connection() -> Generator[psycopg.Connection, None, None]:
    """Yield a connection. Auto-closes on exit. Use for read-only or single-statement work."""
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        yield conn


@contextmanager
def with_transaction() -> Generator[psycopg.Connection, None, None]:
    """
    Yield a connection with an open transaction.
    Commits on success, rolls back on exception.
    Use for multi-statement writes.
    """
    with psycopg.connect(settings.database_url, row_factory=dict_row) as conn:
        with conn.transaction():
            yield conn
