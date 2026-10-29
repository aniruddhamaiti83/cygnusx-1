"""Repository-root entrypoint convenience wrapper."""
from __future__ import annotations
import importlib.util
from pathlib import Path
_path = Path(__file__).resolve().parent / "backend" / "runner.py"
_spec = importlib.util.spec_from_file_location("cygnusx1_backend_runner", _path)
if _spec is None or _spec.loader is None:
    raise RuntimeError(f"Cannot load API runner at {_path}")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
if __name__ == "__main__":
    _module.main()
