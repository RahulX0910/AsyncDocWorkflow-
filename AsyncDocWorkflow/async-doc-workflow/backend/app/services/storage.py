import uuid
from pathlib import Path

import aiofiles

from app.config import settings


def _upload_dir() -> Path:
    p = Path(settings.UPLOAD_DIR)
    p.mkdir(parents=True, exist_ok=True)
    return p


async def save_upload(filename: str, data: bytes) -> tuple[str, Path]:
    """
    Save raw bytes to disk under a unique name.
    Returns (unique_filename, full_path).
    """
    ext = Path(filename).suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    dest = _upload_dir() / unique_name

    async with aiofiles.open(dest, "wb") as f:
        await f.write(data)

    return unique_name, dest


def get_upload_path(unique_filename: str) -> Path:
    return _upload_dir() / unique_filename