import os
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv()  # load backend/.env (MAXAI_ANTHROPIC_KEY, MAXAI_MODEL, …) if present
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import projects, documents, ops, ai_router, ingest
from .seed import seed_db
from . import ingest_watch

Base.metadata.create_all(bind=engine)
seed_db()

app = FastAPI(title="MAX.ai API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True,
)
app.include_router(projects.router)
app.include_router(documents.router)
app.include_router(ops.router)
app.include_router(ai_router.router)
app.include_router(ingest.router)

# Scheduled auto-ingest of the watched drop-zone (hourly by default).
_scheduler = None
if ingest_watch.auto_enabled():
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        ingest_watch.ensure_dirs()
        _scheduler = BackgroundScheduler(daemon=True)
        _scheduler.add_job(lambda: ingest_watch.scan(), "interval",
                           minutes=ingest_watch.interval_minutes(), id="autoingest",
                           next_run_time=datetime.now() + timedelta(seconds=8),
                           max_instances=1, coalesce=True)
        _scheduler.start()
    except Exception as e:  # pragma: no cover - scheduler is best-effort
        logging.getLogger("uvicorn").warning("Auto-ingest scheduler not started: %s", e)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "max-ai"}


# Serve the built frontend (single-port deployment) when frontend/dist exists.
_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.isdir(_DIST):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    _assets = os.path.join(_DIST, "assets")
    if os.path.isdir(_assets):
        app.mount("/assets", StaticFiles(directory=_assets), name="assets")

    @app.get("/{full_path:path}")
    def _spa(full_path: str):
        target = os.path.join(_DIST, full_path)
        if full_path and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(_DIST, "index.html"))
