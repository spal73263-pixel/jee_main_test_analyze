import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
IS_VERCEL = bool(os.getenv("VERCEL"))

DEFAULT_DB_PATH = "/tmp/jee_analyzer.db" if IS_VERCEL else f"{BASE_DIR}/jee_analyzer.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
JWT_SECRET = os.getenv("JWT_SECRET", "jee_main_secret_key_secure_and_random_token_12345")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
DEFAULT_UPLOAD_DIR = "/tmp/uploads" if IS_VERCEL else str(BASE_DIR / "uploads")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", DEFAULT_UPLOAD_DIR)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

os.makedirs(UPLOAD_DIR, exist_ok=True)
