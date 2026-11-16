"""Repository-root convenience entrypoint for the backend API."""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import the backend runner from backend/ now present at the front of sys.path.
from runner import main  # noqa: E402


if __name__ == "__main__":
    main()
