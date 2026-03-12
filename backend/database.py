from __future__ import annotations

import os
import re
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

_RAW_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/ultimatetracker")

# asyncpg não aceita sslmode/channel_binding na URL — remove e passa via connect_args
def _parse_url(url: str) -> tuple[str, dict]:
    connect_args: dict = {}
    if "neon.tech" in url or "sslmode=require" in url or "ssl=require" in url:
        connect_args["ssl"] = "require"
    url = re.sub(r"[?&]sslmode=[^&]*", "", url)
    url = re.sub(r"[?&]ssl=[^&]*", "", url)
    url = re.sub(r"[?&]channel_binding=[^&]*", "", url)
    url = url.rstrip("?&")
    return url, connect_args

DATABASE_URL, _connect_args = _parse_url(_RAW_URL)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=_connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with SessionLocal() as session:
        yield session


async def create_tables() -> None:
    """Create all tables on startup (idempotent — use Alembic for migrations).
    
    Raises ConnectionError if the database is not reachable.
    """
    import models  # noqa: F401 — ensure models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
