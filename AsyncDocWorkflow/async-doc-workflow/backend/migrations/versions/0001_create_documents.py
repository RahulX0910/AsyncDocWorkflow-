"""create documents table

Revision ID: 0001
Revises:
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TYPE doc_status AS ENUM (
            'uploaded', 'processing', 'completed', 'failed'
        )
    """)

    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=True),
        sa.Column("file_size", sa.Integer, nullable=True),
        sa.Column(
            "status",
            sa.Enum("uploaded", "processing", "completed", "failed", name="doc_status"),
            nullable=False,
            server_default="uploaded",
        ),
        sa.Column("progress", sa.Integer, nullable=False, server_default="0"),
        sa.Column("task_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("extracted_data", sa.JSON, nullable=True),
        sa.Column("finalized_data", sa.JSON, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("ix_documents_status", "documents", ["status"])
    op.create_index("ix_documents_created_at", "documents", ["created_at"])


def downgrade() -> None:
    op.drop_table("documents")
    op.execute("DROP TYPE doc_status")