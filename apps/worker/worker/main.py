"""
Worker entry point. Consumes try-on jobs from Redis queue.
"""

import logging
import sys

from worker.tasks.tryon import consume_tryon_queue

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)


def main() -> None:
    consume_tryon_queue()


if __name__ == "__main__":
    main()
