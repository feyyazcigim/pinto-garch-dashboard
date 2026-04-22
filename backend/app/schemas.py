"""Pydantic request/response models for the API."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

Spec = Literal["GARCH", "EGARCH", "GJR"]
Dist = Literal["normal", "t", "skewt"]


class AssetOut(BaseModel):
    id: str
    label: str
    is_peg: bool


class MetaOut(BaseModel):
    assets: list[AssetOut]
    specs: list[Spec]
    dists: list[Dist]
    min_date: date
    max_date: date


class FitRequest(BaseModel):
    asset: str
    spec: Spec
    dist: Dist
    start: date | None = None
    end: date | None = None


class ParamOut(BaseModel):
    name: str
    value: float
    std_err: float
    t_stat: float
    p_value: float


class BacktestOut(BaseModel):
    alpha: float
    violations: int
    n: int
    kupiec_stat: float
    kupiec_p: float
    kupiec_pass: bool
    christoffersen_stat: float
    christoffersen_p: float
    christoffersen_pass: bool


class SeriesPoint(BaseModel):
    date: str
    value: float


class FitResponse(BaseModel):
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
    params: list[ParamOut]
    conditional_vol: list[SeriesPoint]
    conditional_vol_annualized: list[SeriesPoint]
    std_resid: list[SeriesPoint]
    returns: list[SeriesPoint]
    backtests: dict[str, BacktestOut]


class ModelGridRequest(BaseModel):
    asset: str
    start: date | None = None
    end: date | None = None


class ModelGridRow(BaseModel):
    spec: Spec
    dist: Dist
    n: int
    converged: bool
    error: str
    loglik: float
    aic: float
    bic: float
    persistence: float
    omega: float
    alpha: float
    beta: float
    gamma: float | None = None
    nu: float | None = None
    lam: float | None = None
    kupiec_95_p: float
    christoffersen_95_p: float
    kupiec_99_p: float
    christoffersen_99_p: float


class ModelGridResponse(BaseModel):
    asset: str
    start: str
    end: str
    rows: list[ModelGridRow]
    best: ModelGridRow | None = None


class CompareRequest(BaseModel):
    assets: list[str] = Field(min_length=1)
    spec: Spec
    dist: Dist
    start: date | None = None
    end: date | None = None


class CompareRow(BaseModel):
    asset: str
    n: int
    converged: bool
    error: str
    aic: float
    bic: float
    loglik: float
    persistence: float
    omega: float
    alpha: float
    beta: float
    gamma: float | None = None
    nu: float | None = None
    lam: float | None = None
    kupiec_95_pass: bool
    christoffersen_95_pass: bool
    kupiec_99_pass: bool
    christoffersen_99_pass: bool


class CompareResponse(BaseModel):
    spec: Spec
    dist: Dist
    start: str
    end: str
    rows: list[CompareRow]


class PricesResponse(BaseModel):
    asset: str
    dates: list[str]
    prices: list[float]
