import json
from typing import AsyncGenerator

import redis.asyncio as aioredis

from app.config import settings
from app.schemas import ProgressEvent

CHANNEL_PREFIX = "doc:progress:"


def _channel(doc_id: str) -> str:
    return f"{CHANNEL_PREFIX}{doc_id}"


# ── Publish (called from Celery worker via sync redis) ────────────

def publish_progress_sync(doc_id: str, event: dict) -> None:
    """Synchronous publish — used inside Celery tasks."""
    import redis as sync_redis

    r = sync_redis.from_url(settings.REDIS_URL)
    r.publish(_channel(doc_id), json.dumps(event))
    r.close()


# ── Subscribe (used by WebSocket endpoint) ────────────────────────

async def subscribe_progress(doc_id: str) -> AsyncGenerator[ProgressEvent, None]:
    """
    Async generator that yields ProgressEvent messages
    for a given document until status is terminal.
    """
    r = aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(_channel(doc_id))

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = json.loads(message["data"])
            event = ProgressEvent(**data)
            yield event
            if event.status in ("completed", "failed"):
                break
    finally:
        await pubsub.unsubscribe(_channel(doc_id))
        await r.aclose()