"""Runtime configuration for the backend.

The dashboard fetches all data directly over HTTP from the same public sources
the pinto-volatility-report pipeline uses (DeFi Llama + the Pinto subgraph).
No local files, no vendored pipeline — everything is computed on demand.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cache_ttl_seconds: int
    allowed_origins: list[str]

    @classmethod
    def load(cls) -> "Settings":
        origins_raw = os.environ.get(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:8080",
        )
        return cls(
            cache_ttl_seconds=int(os.environ.get("CACHE_TTL_SECONDS", "600")),
            allowed_origins=[o.strip() for o in origins_raw.split(",") if o.strip()],
        )


SETTINGS = Settings.load()
