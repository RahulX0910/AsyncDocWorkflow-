"""
WebSocket endpoint for live document progress.

Frontend connects to:
  ws://localhost:8000/ws/{doc_id}

It receives JSON messages in the shape of ProgressEvent:
  {
    "doc_id": "...",
    "status": "processing" | "completed" | "failed",
    "progress": 0-100,
    "message": "Extracting content...",
    "extracted_data": { ... } | null
  }

The connection closes automatically when status reaches
"completed" or "failed".
"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.pubsub.redis_pubsub import subscribe_progress

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{doc_id}")
async def document_progress_ws(websocket: WebSocket, doc_id: str):
    await websocket.accept()
    try:
        async for event in subscribe_progress(doc_id):
            await websocket.send_text(event.model_dump_json())
            if event.status in ("completed", "failed"):
                break
    except WebSocketDisconnect:
        pass
    finally:
        await websocket.close()


# ── Global broadcast WebSocket (all doc events) ───────────────────
# Useful for the DocumentCart to update all docs in real time

from app.pubsub.redis_pubsub import CHANNEL_PREFIX
import redis.asyncio as aioredis
from app.config import settings


@router.websocket("/ws")
async def global_progress_ws(websocket: WebSocket):
    """
    Broadcasts all document events to the frontend dashboard.
    Frontend receives: { type: "doc_update" | "doc_added", doc: {...} }
    """
    await websocket.accept()
    r = aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.psubscribe(f"{CHANNEL_PREFIX}*")  # subscribe to ALL doc channels

    try:
        async for message in pubsub.listen():
            if message["type"] not in ("pmessage", "message"):
                continue
            data = json.loads(message["data"])
            # Wrap as doc_update so frontend hook can handle it
            await websocket.send_json({"type": "doc_update", "doc": data})
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.punsubscribe(f"{CHANNEL_PREFIX}*")
        await r.aclose()
        await websocket.close()