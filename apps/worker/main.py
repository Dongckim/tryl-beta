#!/usr/bin/env python3
"""
Entry point for async try-on job worker.

Consumes job IDs from Redis queue, processes via tryon service.
Run from apps/worker: python main.py  or  python -m worker.main
"""

from worker.main import main

if __name__ == "__main__":
    main()
