"""VaR backtests — Kupiec POF (unconditional coverage) + Christoffersen
independence — ported from
`pinto-volatility-report/src/metrics/full_metrics.py::_var_backtest`.

Distribution-free: uses the empirical quantile of standardized residuals
to form the VaR threshold, so results are comparable across innovation
distributions (normal / t / skewt) without assuming the fitted CDF.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np
from scipy import stats


@dataclass(frozen=True)
class BacktestResult:
    alpha: float
    violations: int
    n: int
    kupiec_stat: float
    kupiec_p: float
    kupiec_pass: bool
    christoffersen_stat: float
    christoffersen_p: float
    christoffersen_pass: bool


def _safe_log(v: float) -> float:
    return math.log(v) if v > 0 else 0.0


def var_backtest(
    r: np.ndarray,
    sigma: np.ndarray,
    alpha: float,
    mu: float = 0.0,
    pass_threshold: float = 0.05,
) -> BacktestResult:
    """Compute Kupiec POF and Christoffersen independence at level `alpha`.

    `alpha` is the VaR tail probability (e.g. 0.05 for 95% VaR). `mu` is the
    mean return (typically the `mu` coefficient from the arch fit). A backtest
    is marked `pass` when the p-value is above `pass_threshold` (i.e. we fail
    to reject the null of correct coverage / independence).
    """
    r = np.asarray(r, dtype=float)
    sigma = np.asarray(sigma, dtype=float)
    assert r.shape == sigma.shape, "r and sigma must have same length"

    std_resid = (r - mu) / sigma
    q = float(np.quantile(std_resid, alpha))
    var_t = mu + q * sigma
    v = (r < var_t).astype(int)
    T = int(len(v))
    x = int(v.sum())
    p = alpha

    # --- Kupiec POF (unconditional coverage) --------------------------------
    if 0 < x < T:
        ll_null = x * math.log(p) + (T - x) * math.log(1 - p)
        ll_alt = x * math.log(x / T) + (T - x) * math.log(1 - x / T)
        lr_kup = -2.0 * (ll_null - ll_alt)
    elif x == 0:
        lr_kup = -2.0 * T * math.log(1 - p)
    else:
        lr_kup = -2.0 * T * math.log(p)
    lr_kup = max(0.0, lr_kup)
    kup_p = float(1 - stats.chi2.cdf(lr_kup, 1))

    # --- Christoffersen independence ----------------------------------------
    n00 = n01 = n10 = n11 = 0
    for i in range(1, T):
        a, b = int(v[i - 1]), int(v[i])
        if a == 0 and b == 0:
            n00 += 1
        elif a == 0 and b == 1:
            n01 += 1
        elif a == 1 and b == 0:
            n10 += 1
        else:
            n11 += 1
    total = n00 + n01 + n10 + n11
    pi_unc = (n01 + n11) / total if total else 0.0
    pi01 = n01 / (n00 + n01) if (n00 + n01) else 0.0
    pi11 = n11 / (n10 + n11) if (n10 + n11) else 0.0
    ll_unc = (n00 + n10) * _safe_log(1 - pi_unc) + (n01 + n11) * _safe_log(pi_unc)
    ll_ind = (
        n00 * _safe_log(1 - pi01)
        + n01 * _safe_log(pi01)
        + n10 * _safe_log(1 - pi11)
        + n11 * _safe_log(pi11)
    )
    lr_chr = -2.0 * (ll_unc - ll_ind)
    if not math.isfinite(lr_chr) or lr_chr < 0:
        lr_chr = 0.0
    chr_p = float(1 - stats.chi2.cdf(lr_chr, 1))

    return BacktestResult(
        alpha=alpha,
        violations=x,
        n=T,
        kupiec_stat=float(lr_kup),
        kupiec_p=kup_p,
        kupiec_pass=kup_p > pass_threshold,
        christoffersen_stat=float(lr_chr),
        christoffersen_p=chr_p,
        christoffersen_pass=chr_p > pass_threshold,
    )
