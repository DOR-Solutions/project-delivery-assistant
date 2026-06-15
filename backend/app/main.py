import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import projects, documents, ops, ai_router
from .seed import seed_db

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

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "max-ai"}
