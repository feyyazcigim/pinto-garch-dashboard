"""Runtime configuration for the backend.

The dashboard fetches all data directly over HTTP from the same public sources
the pinto-volatility-report pipeline uses (DeFi Llama + the Pinto subgraph).
No local files, no vendored pipeline — everything is computed on demand.
"""
from __future__ import annotations

import os
from dataclasses import dataclass


def _normalise_origin(raw: str) -> str:
    """Strip whitespace + trailing slash so config values line up with the
    exact `Origin` header the browser sends."""
    return raw.strip().rstrip("/")


def _parse_origins(raw: str) -> list[str]:
    return [_normalise_origin(o) for o in raw.split(",") if o.strip()]


@dataclass(frozen=True)
class Settings:
    cache_ttl_seconds: int
    allowed_origins: list[str]
    allow_all_origins: bool

    @classmethod
    def load(cls) -> "Settings":
        origins_raw = os.environ.get(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:8080",
        )
        parsed = _parse_origins(origins_raw)
        return cls(
            cache_ttl_seconds=int(os.environ.get("CACHE_TTL_SECONDS", "600")),
            allowed_origins=parsed,
            allow_all_origins="*" in parsed,
        )


SETTINGS = Settings.load()
