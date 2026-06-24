from celery import Celery

from app.config import settings

celery_app = Celery(
    "async_doc_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # task only acked after completion
    worker_prefetch_multiplier=1,  # one task at a time per worker
)