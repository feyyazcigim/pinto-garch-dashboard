"""FastAPI app entry — Pinto GARCH Dashboard backend.

Data flow:
1. Frontend posts `{ asset, spec, dist, start, end }`.
2. Backend fetches the daily return series live from DeFi Llama (for market
   assets) or the Pinto subgraph (for Pinto itself) — no CSV persistence.
3. `arch` fits the requested model in a thread pool.
4. Result (params with std errors, conditional vol, standardized residuals,
   Kupiec + Christoffersen backtests) is returned as JSON.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import SETTINGS
from .routers import compare, garch, meta, prices
from .services import data_source


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001 — FastAPI passes the app
    try:
        yield
    finally:
        await data_source.close()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Pinto GARCH Dashboard API",
        version="0.1.0",
        description=(
            "Real-time GARCH / EGARCH / GJR-GARCH fitting. Data is pulled live "
            "from DeFi Llama and the Pinto subgraph on every (cached) request."
        ),
        lifespan=lifespan,
    )
    # If ALLOWED_ORIGINS contains "*", open CORS fully (safe because we run
    # with allow_credentials=False). Otherwise use the explicit list and also
    # match Railway + Vercel preview domains via regex so you don't have to
    # chase URLs every time a preview is redeployed.
    if SETTINGS.allow_all_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=SETTINGS.allowed_origins,
            allow_origin_regex=r"https?://([a-z0-9-]+\.)*(railway\.app|vercel\.app|up\.railway\.app)$",
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, object]:
        return {
            "ok": True,
            "cors": {
                "allow_all": SETTINGS.allow_all_origins,
                "origins": SETTINGS.allowed_origins,
            },
        }

    app.include_router(meta.router)
    app.include_router(prices.router)
    app.include_router(garch.router)
    app.include_router(compare.router)
    return app


app = create_app()
