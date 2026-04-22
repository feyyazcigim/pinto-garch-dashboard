"""GARCH fit endpoint — the dashboard's primary data producer."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..schemas import (
    BacktestOut,
    FitRequest,
    FitResponse,
    ParamOut,
    SeriesPoint,
)
from ..services.backtests import BacktestResult
from ..services.data_source import DataSourceError
from ..services.garch_fit import FitResult, fit

router = APIRouter(prefix="/api", tags=["garch"])


def _series(dates: list[str], values: list[float]) -> list[SeriesPoint]:
    return [SeriesPoint(date=d, value=v) for d, v in zip(dates, values)]


def _backtest(b: BacktestResult) -> BacktestOut:
    return BacktestOut(
        alpha=b.alpha,
        violations=b.violations,
        n=b.n,
        kupiec_stat=b.kupiec_stat,
        kupiec_p=b.kupiec_p,
        kupiec_pass=b.kupiec_pass,
        christoffersen_stat=b.christoffersen_stat,
        christoffersen_p=b.christoffersen_p,
        christoffersen_pass=b.christoffersen_pass,
    )


def to_fit_response(r: FitResult) -> FitResponse:
    return FitResponse(
        asset=r.asset,
        spec=r.spec,
        dist=r.dist,
        start=r.start,
        end=r.end,
        n=r.n,
        converged=r.converged,
        error=r.error,
        loglik=r.loglik,
        aic=r.aic,
        bic=r.bic,
        persistence=r.persistence,
        params=[ParamOut(**p.__dict__) for p in r.params],
        conditional_vol=_series(r.dates, r.conditional_vol),
        conditional_vol_annualized=_series(r.dates, r.conditional_vol_annualized),
        std_resid=_series(r.dates, r.std_resid),
        returns=_series(r.dates, r.returns),
        backtests={k: _backtest(v) for k, v in r.backtests.items()},
    )


@router.post("/garch/fit", response_model=FitResponse)
async def post_fit(req: FitRequest) -> FitResponse:
    try:
        result = await fit(req.asset, req.spec, req.dist, req.start, req.end)
    except DataSourceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return to_fit_response(result)
