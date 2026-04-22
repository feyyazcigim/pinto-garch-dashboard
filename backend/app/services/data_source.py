"""Live data fetchers — no CSV persistence.

The dashboard pulls daily returns straight from the same internet sources the
original `pinto-volatility-report` pipeline uses:

* **Pinto** → GraphQL subgraph at `https://graph.pinto.money/pinto`,
  `beanHourlySnapshots { twaPrice, … }` paginated by `seasonNumber`, then
  resampled hourly → daily.
* **All other assets** (btc / eth / doge / ampl / lusd / bold / dai / usds /
  crvusd) → DeFi Llama `coins.llama.fi/chart/{slug}?start=…&span=…&period=1d`.

Results live in an in-memory LRU cache keyed by `(asset, start, end)` so rapid
model-switching in the UI doesn't re-hit the APIs.
"""
from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any

import httpx
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Config — mirrors the relevant bits of pipeline/config.yaml so the dashboard
# is self-contained and doesn't need a file on disk.
# ---------------------------------------------------------------------------

DEFILLAMA_BASE = "https://coins.llama.fi"
PINTO_SUBGRAPH = "https://graph.pinto.money/pinto"
PINTO_TOKEN_ADDRESS = "0xb170000aeeFa790fa61D6e837d1035906839a3c8"
# Pinto inception timestamp (block 22622966 on Base, 2024-11-19 ~09:00 UTC).
# Used as the earliest `start` we'll query DeFi Llama for when the user
# doesn't specify one; keeps the comparison series aligned with Pinto.
PINTO_INCEPTION_UNIX = 1732006800  # 2024-11-19T09:00:00Z

DEFILLAMA_SLUGS: dict[str, str] = {
    "btc": "coingecko:bitcoin",
    "eth": "coingecko:ethereum",
    "doge": "coingecko:dogecoin",
    "ampl": "coingecko:ampleforth",
    "lusd": "coingecko:liquity-usd",
    "bold": "coingecko:liquity-bold-2",
    "dai": "ethereum:0x6b175474e89094c44da98b954eedeac495271d0f",
    "usds": "coingecko:usds",
    "crvusd": "ethereum:0xf939e0a03fb07f59a73314e73794be0e57ac1b4e",
}

ASSET_LABELS: dict[str, str] = {
    "pinto": "Pinto",
    "btc": "Bitcoin",
    "eth": "Ethereum",
    "doge": "Dogecoin",
    "ampl": "Ampleforth",
    "lusd": "Liquity USD",
    "bold": "Liquity BOLD",
    "dai": "Dai",
    "usds": "USDS",
    "crvusd": "crvUSD",
}

PEG_TARGETED = {"pinto", "ampl", "lusd", "bold", "dai", "usds", "crvusd"}

ALL_ASSETS = ["pinto", *DEFILLAMA_SLUGS.keys()]


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------

class DataSourceError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# TTL cache
# ---------------------------------------------------------------------------

@dataclass
class _CacheEntry:
    expires_at: float
    df: pd.DataFrame  # columns: date (datetime64), price (float)


class _TTLCache:
    def __init__(self, ttl_seconds: int, maxsize: int = 64) -> None:
        self.ttl = ttl_seconds
        self.maxsize = maxsize
        self._store: dict[str, _CacheEntry] = {}

    def get(self, key: str) -> pd.DataFrame | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        if entry.expires_at < _now():
            self._store.pop(key, None)
            return None
        return entry.df

    def set(self, key: str, df: pd.DataFrame) -> None:
        if len(self._store) >= self.maxsize:
            # Drop the oldest entry.
            oldest = min(self._store.items(), key=lambda kv: kv[1].expires_at)
            self._store.pop(oldest[0], None)
        self._store[key] = _CacheEntry(expires_at=_now() + self.ttl, df=df)


def _now() -> float:
    return datetime.now(tz=timezone.utc).timestamp()


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------

_CLIENT: httpx.AsyncClient | None = None
_CLIENT_LOCK = asyncio.Lock()


async def _client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None:
        async with _CLIENT_LOCK:
            if _CLIENT is None:
                _CLIENT = httpx.AsyncClient(
                    timeout=httpx.Timeout(30.0, connect=10.0),
                    headers={"User-Agent": "pinto-garch-dashboard/0.1"},
                    http2=False,
                )
    return _CLIENT


async def _get_json(url: str, *, retries: int = 3) -> Any:
    c = await _client()
    delay = 1.0
    last_exc: Exception | None = None
    for _ in range(retries):
        try:
            resp = await c.get(url)
            resp.raise_for_status()
            return resp.json()
        except (httpx.HTTPError, ValueError) as exc:  # noqa: PERF203
            last_exc = exc
            await asyncio.sleep(delay)
            delay *= 2
    raise DataSourceError(f"GET {url} failed after {retries} attempts: {last_exc}")


async def _post_graphql(url: str, query: str, variables: dict, *, retries: int = 3) -> Any:
    c = await _client()
    delay = 1.0
    last_exc: Exception | None = None
    for _ in range(retries):
        try:
            resp = await c.post(url, json={"query": query, "variables": variables})
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                raise DataSourceError(f"GraphQL errors: {data['errors']}")
            return data["data"]
        except (httpx.HTTPError, ValueError) as exc:
            last_exc = exc
            await asyncio.sleep(delay)
            delay *= 2
    raise DataSourceError(f"POST {url} failed after {retries} attempts: {last_exc}")


# ---------------------------------------------------------------------------
# DeFi Llama: daily close prices for non-Pinto assets
# ---------------------------------------------------------------------------

SECONDS_PER_DAY = 86400
_DL_CHART_SPAN = 365  # page size


async def _fetch_defillama(asset: str, start_unix: int, end_unix: int) -> pd.DataFrame:
    slug = DEFILLAMA_SLUGS.get(asset)
    if slug is None:
        raise DataSourceError(f"unknown defillama asset {asset!r}")

    merged: dict[int, float] = {}
    cursor = start_unix
    while cursor < end_unix:
        url = f"{DEFILLAMA_BASE}/chart/{slug}?start={cursor}&span={_DL_CHART_SPAN}&period=1d"
        payload = await _get_json(url)
        coin = (payload.get("coins") or {}).get(slug) or {}
        prices = coin.get("prices") or []
        if not prices:
            break
        for p in prices:
            ts = int(p["timestamp"])
            merged[ts] = float(p["price"])
        last_ts = int(prices[-1]["timestamp"])
        nxt = last_ts + SECONDS_PER_DAY
        if nxt <= cursor:
            break
        cursor = nxt
        # Small delay to stay under DeFi Llama's rate limits; 150ms matches
        # the original pipeline's `defillama_delay_ms`.
        await asyncio.sleep(0.15)

    if not merged:
        return pd.DataFrame(columns=["date", "price"])
    df = pd.DataFrame(
        [{"date": pd.Timestamp(ts, unit="s", tz="UTC").normalize().tz_localize(None), "price": price}
         for ts, price in sorted(merged.items())]
    )
    df = df.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Pinto subgraph: hourly → daily close of twaPrice
# ---------------------------------------------------------------------------

_BEAN_HOURLY_QUERY = """
query BeanHourlySnapshots($bean: Bytes!, $sinceSeason: Int!, $first: Int!) {
  beanHourlySnapshots(
    first: $first
    where: { bean: $bean, seasonNumber_gt: $sinceSeason }
    orderBy: seasonNumber
    orderDirection: asc
  ) {
    seasonNumber
    twaPrice
    instPrice
    lastUpdateTimestamp
  }
}
"""

_BEAN_PAGE_SIZE = 1000


async def _fetch_pinto_hourly() -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    since_season = 0
    # Guard against runaway pagination.
    for _ in range(200):
        data = await _post_graphql(
            PINTO_SUBGRAPH,
            _BEAN_HOURLY_QUERY,
            {
                "bean": PINTO_TOKEN_ADDRESS.lower(),
                "sinceSeason": since_season,
                "first": _BEAN_PAGE_SIZE,
            },
        )
        page = data.get("beanHourlySnapshots") or []
        if not page:
            break
        rows.extend(page)
        since_season = int(page[-1]["seasonNumber"])
        if len(page) < _BEAN_PAGE_SIZE:
            break
    if not rows:
        return pd.DataFrame(columns=["datetime", "twaPrice"])

    df = pd.DataFrame(rows)
    df["twaPrice"] = pd.to_numeric(df["twaPrice"], errors="coerce")
    df["instPrice"] = pd.to_numeric(df.get("instPrice"), errors="coerce")
    df["datetime"] = pd.to_datetime(
        pd.to_numeric(df["lastUpdateTimestamp"], errors="coerce"),
        unit="s",
        utc=True,
    ).dt.tz_localize(None)
    df = df.dropna(subset=["datetime", "twaPrice"]).sort_values("datetime").reset_index(drop=True)
    return df[["datetime", "twaPrice"]]


async def _fetch_pinto_daily() -> pd.DataFrame:
    hourly = await _fetch_pinto_hourly()
    if hourly.empty:
        return pd.DataFrame(columns=["date", "price"])
    hourly = hourly.set_index("datetime")
    daily_price = hourly["twaPrice"].resample("1D").last().dropna()
    out = pd.DataFrame({"date": daily_price.index, "price": daily_price.values})
    return out.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Public surface — returns pandas series on request
# ---------------------------------------------------------------------------

_price_cache = _TTLCache(ttl_seconds=600, maxsize=32)


async def _fetch_price_series(asset: str) -> pd.DataFrame:
    """Return the full daily price history for `asset` from inception, cached."""
    cached = _price_cache.get(asset)
    if cached is not None:
        return cached
    if asset == "pinto":
        df = await _fetch_pinto_daily()
    else:
        end_unix = int(_now())
        df = await _fetch_defillama(asset, PINTO_INCEPTION_UNIX, end_unix)
    if df.empty:
        raise DataSourceError(f"no price data returned for asset {asset!r}")
    _price_cache.set(asset, df)
    return df


def _prices_to_returns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    # Guard against division-by-zero at inception (e.g. Pinto's first hourly
    # snapshot can be ~0 before price is oracle-bootstrapped): drop any
    # non-positive prices before computing pct-change.
    out = out[out["price"] > 0].reset_index(drop=True)
    out["return"] = out["price"].pct_change()
    out = out[np.isfinite(out["return"].fillna(0.0))]
    return out


async def get_return_series(
    asset: str,
    start: date | None = None,
    end: date | None = None,
) -> tuple[list[str], np.ndarray]:
    df = await _fetch_price_series(asset)
    df = _prices_to_returns(df)
    if start is not None:
        df = df[df["date"] >= pd.Timestamp(start)]
    if end is not None:
        df = df[df["date"] <= pd.Timestamp(end)]
    df = df.dropna(subset=["return"])
    dates = df["date"].dt.date.astype(str).tolist()
    returns = df["return"].to_numpy(dtype=float)
    return dates, returns


async def get_price_series(
    asset: str,
    start: date | None = None,
    end: date | None = None,
) -> tuple[list[str], np.ndarray]:
    df = await _fetch_price_series(asset)
    if start is not None:
        df = df[df["date"] >= pd.Timestamp(start)]
    if end is not None:
        df = df[df["date"] <= pd.Timestamp(end)]
    dates = df["date"].dt.date.astype(str).tolist()
    prices = df["price"].to_numpy(dtype=float)
    return dates, prices


async def available_assets() -> list[dict[str, Any]]:
    # Probe each asset in parallel; keep the ones that return a non-empty series.
    async def probe(a: str) -> tuple[str, bool]:
        try:
            df = await _fetch_price_series(a)
            return a, not df.empty
        except DataSourceError:
            return a, False

    results = await asyncio.gather(*(probe(a) for a in ALL_ASSETS))
    ok = {a for a, good in results if good}
    return [
        {"id": a, "label": ASSET_LABELS[a], "is_peg": a in PEG_TARGETED}
        for a in ALL_ASSETS
        if a in ok
    ]


async def date_bounds() -> tuple[date, date]:
    pinto = await _fetch_price_series("pinto")
    if pinto.empty:
        now = datetime.now(tz=timezone.utc).date()
        return now, now
    return pinto["date"].min().date(), pinto["date"].max().date()


def invalidate_cache() -> None:
    _price_cache._store.clear()


async def close() -> None:
    global _CLIENT
    if _CLIENT is not None:
        await _CLIENT.aclose()
        _CLIENT = None
