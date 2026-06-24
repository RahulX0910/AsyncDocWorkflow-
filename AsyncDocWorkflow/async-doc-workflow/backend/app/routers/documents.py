import mimetypes
from typing import List, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps import get_db
from app.models import Document
from app.schemas import DocumentOut, DocumentPatch
from app.services.export import to_csv, to_json
from app.services.storage import save_upload
from app.worker.tasks import process_document

router = APIRouter(prefix="/documents", tags=["documents"])


def _detect_mime(filename: str, provided: str | None) -> str:
    """
    Use provided mime type if it's not generic,
    otherwise detect from filename extension.
    """
    generic = {"application/octet-stream", "binary/octet-stream", None, ""}
    if provided not in generic:
        return provided
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


# ── Upload ────────────────────────────────────────────────────────

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    data = await file.read()

    # Size guard
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

    # Detect proper mime type
    mime_type = _detect_mime(file.filename, file.content_type)

    # Persist to disk
    unique_name, full_path = await save_upload(file.filename, data)

    # Create DB record
    doc = Document(
        filename=unique_name,
        original_filename=file.filename,
        file_path=str(full_path),
        mime_type=mime_type,
        file_size=len(data),
        status="uploaded",
        progress=0,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Enqueue background task — does NOT block this response
    task = process_document.delay(doc.id, str(full_path), mime_type)
    doc.task_id = task.id
    await db.commit()
    await db.refresh(doc)

    return doc


# ── List ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    return result.scalars().all()


# ── Get one ───────────────────────────────────────────────────────

@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc


# ── Patch (edit finalized data) ───────────────────────────────────

@router.patch("/{doc_id}", response_model=DocumentOut)
async def patch_document(
    doc_id: str,
    payload: DocumentPatch,
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    if payload.finalized_data is not None:
        doc.finalized_data = payload.finalized_data

    await db.commit()
    await db.refresh(doc)
    return doc


# ── Delete ────────────────────────────────────────────────────────

@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    await db.delete(doc)
    await db.commit()


# ── Export ────────────────────────────────────────────────────────

@router.get("/{doc_id}/export/{fmt}")
async def export_document(
    doc_id: str,
    fmt: Literal["csv", "json"],
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found")

    # Use finalized_data if available, else fall back to extracted_data
    data = doc.finalized_data or doc.extracted_data or {}

    if fmt == "csv":
        content = to_csv(data, doc.original_filename)
        return Response(
            content=content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{doc.original_filename}.csv"'
            },
        )
    else:
        content = to_json(data)
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{doc.original_filename}.json"'
            },
        )