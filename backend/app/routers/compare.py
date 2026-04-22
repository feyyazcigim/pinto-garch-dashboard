"""Model-grid and cross-asset comparison endpoints."""
from __future__ import annotations

import asyncio
import math

from fastapi import APIRouter, HTTPException

from ..schemas import (
    CompareRequest,
    CompareResponse,
    CompareRow,
    ModelGridRequest,
    ModelGridResponse,
    ModelGridRow,
)
from ..services.data_source import DataSourceError
from ..services.garch_fit import FitResult, fit, fit_grid

router = APIRouter(prefix="/api", tags=["compare"])


def _get_param(r: FitResult, name: str) -> float:
    for p in r.params:
        if p.name == name:
            return p.value
    return float("nan")


def _grid_row(r: FitResult) -> ModelGridRow:
    return ModelGridRow(
        spec=r.spec,
        dist=r.dist,
        n=r.n,
        converged=r.converged,
        error=r.error,
        loglik=r.loglik,
        aic=r.aic,
        bic=r.bic,
        persistence=r.persistence,
        omega=_get_param(r, "omega"),
        alpha=_get_param(r, "alpha[1]"),
        beta=_get_param(r, "beta[1]"),
        gamma=_get_param(r, "gamma[1]"),
        nu=_get_param(r, "nu"),
        lam=_get_param(r, "lambda"),
        kupiec_95_p=r.backtests["0.05"].kupiec_p if "0.05" in r.backtests else float("nan"),
        christoffersen_95_p=r.backtests["0.05"].christoffersen_p if "0.05" in r.backtests else float("nan"),
        kupiec_99_p=r.backtests["0.01"].kupiec_p if "0.01" in r.backtests else float("nan"),
        christoffersen_99_p=r.backtests["0.01"].christoffersen_p if "0.01" in r.backtests else float("nan"),
    )


@router.post("/garch/grid", response_model=ModelGridResponse)
async def post_grid(req: ModelGridRequest) -> ModelGridResponse:
    try:
        fits = await fit_grid(req.asset, req.start, req.end)
    except DataSourceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    rows = [_grid_row(r) for r in fits]
    best = None
    best_aic = math.inf
    for row in rows:
        if row.converged and math.isfinite(row.aic) and row.aic < best_aic:
            best_aic = row.aic
            best = row
    return ModelGridResponse(
        asset=req.asset,
        start=req.start.isoformat() if req.start else "",
        end=req.end.isoformat() if req.end else "",
        rows=rows,
        best=best,
    )


@router.post("/garch/compare", response_model=CompareResponse)
async def post_compare(req: CompareRequest) -> CompareResponse:
    async def fit_one(asset: str) -> FitResult:
        return await fit(asset, req.spec, req.dist, req.start, req.end)

    try:
        fits = await asyncio.gather(*(fit_one(a) for a in req.assets))
    except DataSourceError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    rows: list[CompareRow] = []
    for r in fits:
        rows.append(
            CompareRow(
                asset=r.asset,
                n=r.n,
                converged=r.converged,
                error=r.error,
                aic=r.aic,
                bic=r.bic,
                loglik=r.loglik,
                persistence=r.persistence,
                omega=_get_param(r, "omega"),
                alpha=_get_param(r, "alpha[1]"),
                beta=_get_param(r, "beta[1]"),
                gamma=_get_param(r, "gamma[1]"),
                nu=_get_param(r, "nu"),
                lam=_get_param(r, "lambda"),
                kupiec_95_pass=r.backtests["0.05"].kupiec_pass if "0.05" in r.backtests else False,
                christoffersen_95_pass=r.backtests["0.05"].christoffersen_pass if "0.05" in r.backtests else False,
                kupiec_99_pass=r.backtests["0.01"].kupiec_pass if "0.01" in r.backtests else False,
                christoffersen_99_pass=r.backtests["0.01"].christoffersen_pass if "0.01" in r.backtests else False,
            )
        )
    return CompareResponse(
        spec=req.spec,
        dist=req.dist,
        start=req.start.isoformat() if req.start else "",
        end=req.end.isoformat() if req.end else "",
        rows=rows,
    )
