"""Pinned looks repository. Raw SQL, returns plain dicts."""

from app.db.connection import get_connection, with_transaction


def count_pins(user_id: int) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS n FROM pinned_looks WHERE user_id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            assert row is not None
            return int(row["n"])


def list_slots(user_id: int) -> list[int]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT slot FROM pinned_looks WHERE user_id = %s ORDER BY slot ASC",
                (user_id,),
            )
            rows = cur.fetchall()
            return [int(r["slot"]) for r in rows]


def get_slot_for_saved_look(user_id: int, saved_look_id: int) -> int | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT slot FROM pinned_looks WHERE user_id = %s AND saved_look_id = %s",
                (user_id, saved_look_id),
            )
            row = cur.fetchone()
            return int(row["slot"]) if row else None


def pin_look(user_id: int, slot: int, saved_look_id: int) -> int:
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pinned_looks (user_id, slot, saved_look_id)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, saved_look_id) DO UPDATE SET slot = EXCLUDED.slot
                RETURNING slot
                """,
                (user_id, slot, saved_look_id),
            )
            row = cur.fetchone()
            assert row is not None
            return int(row["slot"])


def unpin_look(user_id: int, saved_look_id: int) -> None:
    with with_transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM pinned_looks WHERE user_id = %s AND saved_look_id = %s",
                (user_id, saved_look_id),
            )


def list_pins(user_id: int) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT slot, saved_look_id
                FROM pinned_looks
                WHERE user_id = %s
                ORDER BY slot ASC
                """,
                (user_id,),
            )
            return cur.fetchall()

