import sys
from pathlib import Path

# Add backend directory to Python module search path so FastAPI & relative backend imports resolve cleanly on Vercel
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402
