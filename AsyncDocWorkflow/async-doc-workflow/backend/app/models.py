import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int] = mapped_column(nullable=True)

    status: Mapped[str] = mapped_column(
        Enum(
            "uploaded",
            "processing",
            "completed",
            "failed",
            name="doc_status",
        ),
        default="uploaded",
        nullable=False,
    )

    progress: Mapped[int] = mapped_column(default=0)          # 0–100
    task_id: Mapped[str] = mapped_column(String(255), nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)

    extracted_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    finalized_data: Mapped[dict] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )