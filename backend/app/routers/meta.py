"""Metadata endpoints — asset list, available date range, supported model specs."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import AssetOut, MetaOut
from ..services.data_source import (
    DataSourceError,
    available_assets,
    date_bounds,
)
from ..services.garch_fit import DISTS, SPECS

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/assets", response_model=MetaOut)
async def get_meta() -> MetaOut:
    try:
        assets = await available_assets()
        mn, mx = await date_bounds()
    except DataSourceError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return MetaOut(
        assets=[AssetOut(id=a["id"], label=a["label"], is_peg=a["is_peg"]) for a in assets],
        specs=list(SPECS),
        dists=list(DISTS),
        min_date=mn,
        max_date=mx,
    )
