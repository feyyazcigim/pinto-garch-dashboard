"""Price series endpoint — returns raw prices for charting context."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from ..schemas import PricesResponse
from ..services.data_source import DataSourceError, get_price_series

router = APIRouter(prefix="/api", tags=["prices"])


@router.get("/prices", response_model=PricesResponse)
async def get_prices(
    asset: str = Query(...),
    start: date | None = Query(None),
    end: date | None = Query(None),
) -> PricesResponse:
    try:
        dates, prices = await get_price_series(asset, start, end)
    except DataSourceError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return PricesResponse(asset=asset, dates=dates, prices=prices.tolist())
