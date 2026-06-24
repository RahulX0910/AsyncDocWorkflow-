from datetime import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel


# ── Document schemas ──────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    filename: str
    original_filename: str
    mime_type: Optional[str]
    file_size: Optional[int]
    status: Literal["uploaded", "processing", "completed", "failed"]
    progress: int
    task_id: Optional[str]
    error_message: Optional[str]
    extracted_data: Optional[Dict[str, Any]]
    finalized_data: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentPatch(BaseModel):
    """Fields the user can edit after extraction."""
    finalized_data: Optional[Dict[str, Any]] = None


# ── Progress event (sent over WebSocket / Pub/Sub) ────────────────

class ProgressEvent(BaseModel):
    doc_id: str
    status: str
    progress: int              # 0–100
    message: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None