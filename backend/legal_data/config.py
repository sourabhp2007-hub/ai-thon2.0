"""Runtime configuration, read from environment variables (see .env.example)."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    database_url: str
    data_dir: Path
    hf_token: str | None
    courtlistener_token: str | None
    embed_model: str
    cors_origins: list[str]


def get_settings() -> Settings:
    return Settings(
        database_url=os.environ.get("DATABASE_URL", "postgresql://legal:legal@localhost:5432/legal_integrity"),
        data_dir=Path(os.environ.get("DATA_DIR", Path(__file__).resolve().parent.parent / "data")),
        hf_token=os.environ.get("HF_TOKEN") or None,
        courtlistener_token=os.environ.get("COURTLISTENER_TOKEN") or None,
        embed_model=os.environ.get("EMBED_MODEL", "BAAI/bge-small-en-v1.5"),
        cors_origins=[o for o in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",") if o],
    )
