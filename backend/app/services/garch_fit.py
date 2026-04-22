"""GARCH / EGARCH / GJR-GARCH fitting with Normal / Student-t / Skew-t
innovations.

Data is fetched live from DeFi Llama + the Pinto subgraph (see
`data_source.py`); nothing is cached to disk. The `arch` library is synchronous
so the actual fit call is dispatched to a thread pool to keep the FastAPI
event loop responsive.

Scaling convention mirrors the upstream pipeline: fit on `returns * 100` for
numerical stability and rescale `omega` by `100²` before returning so callers
see native-return-scale parameters.
"""
from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass, field
from datetime import date
from typing import Literal

import numpy as np
from arch import arch_model

from .backtests import BacktestResult, var_backtest
from . import data_source

Spec = Literal["GARCH", "EGARCH", "GJR"]
Dist = Literal["normal", "t", "skewt"]

SPECS: tuple[Spec, ...] = ("GARCH", "EGARCH", "GJR")
DISTS: tuple[Dist, ...] = ("normal", "t", "skewt")

ANNUAL_DAYS = 365
SCALE = 100.0


_SPEC_KWARGS: dict[Spec, dict] = {
    "GARCH": dict(vol="GARCH", p=1, q=1, o=0),
    "EGARCH": dict(vol="EGARCH", p=1, q=1, o=1),
    "GJR": dict(vol="GARCH", p=1, q=1, o=1),
}


@dataclass(frozen=True)
class ParamEstimate:
    name: str
    value: float
    std_err: float
    t_stat: float
    p_value: float


@dataclass(frozen=True)
class FitResult:
    asset: str
    spec: Spec
    dist: Dist
    start: str
    end: str
    n: int
    converged: bool
    error: str
    loglik: float
    aic: float
    bic: float
    persistence: float
    params: list[ParamEstimate]
    dates: list[str]
    returns: list[float]
    conditional_vol: list[float]
    conditional_vol_annualized: list[float]
    std_resid: list[float]
    backtests: dict[str, BacktestResult] = field(default_factory=dict)


def _persistence(spec: Spec, params: dict[str, float]) -> float:
    alpha = params.get("alpha[1]", 0.0)
    beta = params.get("beta[1]", 0.0)
    gamma = params.get("gamma[1]", 0.0)
    if spec == "GARCH":
        return float(alpha + beta)
    if spec == "GJR":
        return float(alpha + beta + gamma / 2.0)
    return float(beta)  # EGARCH


def _empty_fit(
    asset: str, spec: Spec, dist: Dist, start: str, end: str, n: int, msg: str
) -> FitResult:
    return FitResult(
        asset=asset,
        spec=spec,
        dist=dist,
        start=start,
        end=end,
        n=n,
        converged=False,
        error=msg[:400],
        loglik=float("nan"),
        aic=float("nan"),
        bic=float("nan"),
        persistence=float("nan"),
        params=[],
        dates=[],
        returns=[],
        conditional_vol=[],
        conditional_vol_annualized=[],
        std_resid=[],
        backtests={},
    )


def _fit_sync(
    asset: str,
    spec: Spec,
    dist: Dist,
    start_str: str,
    end_str: str,
    dates: list[str],
    raw_returns: np.ndarray,
) -> FitResult:
    n = len(raw_returns)
    if n < 60:
        return _empty_fit(
            asset, spec, dist, start_str, end_str, n,
            f"insufficient_sample_{n} (need >=60)",
        )

    r_scaled = raw_returns * SCALE
    try:
        model = arch_model(r_scaled, mean="Constant", dist=dist, **_SPEC_KWARGS[spec])
        res = model.fit(disp="off", show_warning=False)
    except Exception as exc:  # noqa: BLE001
        return _empty_fit(asset, spec, dist, start_str, end_str, n, f"fit_failed: {exc}")

    p = {k: float(v) for k, v in res.params.to_dict().items()}
    se = {k: float(v) for k, v in res.std_err.to_dict().items()}
    tvals = {k: float(v) for k, v in res.tvalues.to_dict().items()}
    pvals = {k: float(v) for k, v in res.pvalues.to_dict().items()}

    params: list[ParamEstimate] = []
    for name in res.params.index:
        value = p[name]
        # Rescale omega from 100²-scaled units back to native-return units.
        if name == "omega":
            scaled_value = value / (SCALE ** 2)
            scaled_se = se[name] / (SCALE ** 2)
        else:
            scaled_value = value
            scaled_se = se[name]
        params.append(
            ParamEstimate(
                name=name,
                value=scaled_value,
                std_err=scaled_se,
                t_stat=tvals[name],
                p_value=pvals[name],
            )
        )

    sigma_scaled = np.asarray(res.conditional_volatility, dtype=float)
    sigma_daily = sigma_scaled / SCALE
    std_resid = np.asarray(res.std_resid, dtype=float)

    mu_scaled = float(p.get("mu", 0.0))
    b95 = var_backtest(r_scaled, sigma_scaled, alpha=0.05, mu=mu_scaled)
    b99 = var_backtest(r_scaled, sigma_scaled, alpha=0.01, mu=mu_scaled)

    return FitResult(
        asset=asset,
        spec=spec,
        dist=dist,
        start=start_str,
        end=end_str,
        n=n,
        converged=True,
        error="",
        loglik=float(res.loglikelihood),
        aic=float(res.aic),
        bic=float(res.bic),
        persistence=_persistence(spec, p),
        params=params,
        dates=dates,
        returns=[float(x) for x in raw_returns],
        conditional_vol=[float(x) for x in sigma_daily],
        conditional_vol_annualized=[float(x * math.sqrt(ANNUAL_DAYS)) for x in sigma_daily],
        std_resid=[float(x) for x in std_resid],
        backtests={"0.05": b95, "0.01": b99},
    )


async def fit(
    asset: str,
    spec: Spec,
    dist: Dist,
    start: date | None = None,
    end: date | None = None,
) -> FitResult:
    dates, raw_returns = await data_source.get_return_series(asset, start, end)
    start_str = start.isoformat() if start else (dates[0] if dates else "")
    end_str = end.isoformat() if end else (dates[-1] if dates else "")
    return await asyncio.to_thread(
        _fit_sync, asset, spec, dist, start_str, end_str, dates, raw_returns
    )


async def fit_grid(
    asset: str,
    start: date | None = None,
    end: date | None = None,
) -> list[FitResult]:
    """Fit all 9 (spec × dist) combinations for one asset."""
    # Fetch once, reuse for all 9 fits.
    dates, raw_returns = await data_source.get_return_series(asset, start, end)
    start_str = start.isoformat() if start else (dates[0] if dates else "")
    end_str = end.isoformat() if end else (dates[-1] if dates else "")

    async def one(spec: Spec, dist: Dist) -> FitResult:
        return await asyncio.to_thread(
            _fit_sync, asset, spec, dist, start_str, end_str, dates, raw_returns
        )

    # Run in parallel via gather; asyncio.to_thread will spread them across
    # the thread pool.
    tasks = [one(s, d) for s in SPECS for d in DISTS]
    return list(await asyncio.gather(*tasks))
