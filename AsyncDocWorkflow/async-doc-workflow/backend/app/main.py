from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import documents, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    await init_db()
    yield


app = FastAPI(
    title="Async Doc Workflow API",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS (allow frontend dev server) ─────────────────────────────
# from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # temporary - works for testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Routers ───────────────────────────────────────────────────────
app.include_router(documents.router)
app.include_router(ws.router)


@app.get("/health")
async def health():
    return {"status": "ok"}