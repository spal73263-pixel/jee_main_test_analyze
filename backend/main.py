import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
import models
from config import UPLOAD_DIR
from routes import (
    users,
    uploads,
    tests,
    analysis,
    subjects,
    predictions,
    study_planner
)

# Create database tables if they do not exist
Base.metadata.create_all(bind=engine)

# Automatically seed demo account if database is empty
try:
    from seed_data import seed
    seed(force_reset=False)
except Exception as e:
    print(f"Auto-seed note: {e}")

app = FastAPI(
    title="JEE Main Performance Analyzer API",
    description="Production-quality REST backend for JEE Main mock test extraction, analytics, and AI recommendations.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for seamless development and deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(users.router)
app.include_router(uploads.router)
app.include_router(tests.router)
app.include_router(analysis.router)
app.include_router(subjects.router)
app.include_router(predictions.router)
app.include_router(study_planner.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "JEE Main Performance Analyzer",
        "version": "1.0.0"
    }

# Production SPA serving: serve built React frontend from frontend/dist if present
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi import HTTPException

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Mount assets folder
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_frontend(full_path: str):
        # Do not intercept API or static uploads
        if full_path.startswith("api") or full_path.startswith("static"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        target_file = FRONTEND_DIST / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
