from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# asyncpg does NOT accept sslmode= in the URL
# Strip it out and pass ssl via connect_args instead
def _build_engine():
    url = settings.DATABASE_URL

    # Remove any query params asyncpg can't handle
    if "?" in url:
        base_url, params = url.split("?", 1)
        # Filter out sslmode and channel_binding
        filtered = "&".join(
            p for p in params.split("&")
            if not p.startswith("sslmode") and not p.startswith("channel_binding")
        )
        url = f"{base_url}?{filtered}" if filtered else base_url

    is_neon = "neon.tech" in settings.DATABASE_URL
    connect_args = {"ssl": "require"} if is_neon else {}

    return create_async_engine(
        url,
        echo=False,
        pool_pre_ping=True,
        connect_args=connect_args,
    )


engine = _build_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """Create all tables on startup (safe to run multiple times)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)