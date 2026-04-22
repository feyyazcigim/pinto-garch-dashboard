# Pinto GARCH Dashboard

Interactive volatility-modeling dashboard that ships section 6.6 of the Pinto volatility report as
a standalone artifact. Pick an asset, date range, model spec (GARCH / EGARCH / GJR-GARCH) and
innovation distribution (Normal / Student-t / Skewed-t); the backend fits the model on demand
using the `arch` library and returns parameter estimates with standard errors, the conditional
volatility series, standardized residuals, AIC/BIC across all nine spec × distribution
combinations, and VaR backtests (Kupiec and Christoffersen at α = 0.05 and 0.01). The UI matches
the Pinto [interface](../interface) design system — fonts, palette, typography utilities, radii
and component primitives all reuse the same tokens.

## Data source — live, no CSV

There is no local data. The backend pulls prices **directly from the internet** on demand:

| Source | URL | Used for |
|---|---|---|
| DeFi Llama `/chart` | `https://coins.llama.fi/chart/{slug}` | `btc, eth, doge, ampl, lusd, bold, dai, usds, crvusd` |
| Pinto subgraph (`beanHourlySnapshots`) | `https://graph.pinto.money/pinto` | `pinto` (hourly `twaPrice` → resampled to daily) |

Results are cached in memory (TTL = 10 min) so rapid model-switching in the UI doesn't re-hit the
APIs. Nothing is written to disk.

## Layout

```
pinto-garch-dashboard/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app, CORS, lifespan
│       ├── config.py            # CACHE_TTL_SECONDS, ALLOWED_ORIGINS
│       ├── schemas.py
│       ├── routers/   meta.py · prices.py · garch.py · compare.py
│       └── services/  data_source.py (async HTTP fetcher)
│                    · garch_fit.py  (arch wrapper, dispatched to threadpool)
│                    · backtests.py  (Kupiec + Christoffersen)
├── frontend/                    # Vite 5 + React 18 + TypeScript + Tailwind
│   └── src/
│       ├── lib/      api.ts · cn.ts · theme.ts · format.ts
│       ├── hooks/    useMeta.ts · useGarchFit.ts
│       ├── components/
│       │   ├── ui/        Radix-based shadcn-style primitives
│       │   ├── controls/  AssetSelect · ModelSelect · DistSelect · DateRangePicker
│       │   ├── charts/    LineChart · CondVolChart · ResidualsChart
│       │   └── panels/    ParamsCard · VaRBacktestPanel · ModelGridTable · CrossAssetTable
│       └── pages/Dashboard.tsx
├── docker-compose.yml           # single-command stack
└── .env.example
```

## Running — local dev

Prerequisites: Python 3.12+ ([uv](https://github.com/astral-sh/uv) recommended), Node 20+,
internet access.

**Backend:**

```bash
cd backend
uv venv --python 3.12
uv sync
.venv/bin/uvicorn app.main:app --reload --port 8000
```

Smoke test:

```bash
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/garch/fit \
  -H 'Content-Type: application/json' \
  -d '{"asset":"pinto","spec":"GARCH","dist":"t"}' \
  | jq '{aic, params: [.params[] | {name, value, std_err}]}'
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173 — proxies /api/* to the backend
```

## Running — Docker Compose

```bash
docker compose up --build
```

Then open <http://localhost:8080>. No volumes, no bind mounts — the backend just needs outbound
HTTPS to `coins.llama.fi` and `graph.pinto.money`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/health`             | Liveness probe. |
| `GET`  | `/api/assets`         | 10 available assets + full date range. |
| `GET`  | `/api/prices`         | Raw daily prices for charting context. |
| `POST` | `/api/garch/fit`      | Fit one `(asset, spec, dist)` combo. Returns params + std errors + conditional vol + standardized residuals + AIC/BIC + Kupiec & Christoffersen. |
| `POST` | `/api/garch/grid`     | Fit all 9 `(spec × dist)` combos for one asset — drives **Model comparison**. |
| `POST` | `/api/garch/compare`  | Fit the chosen spec + dist across every asset — drives **Cross-asset**. |

## Math & implementation notes

* **Returns:** daily simple returns computed in-memory from the fetched price series. For Pinto,
  hourly `twaPrice` is resampled to daily last-value before differencing.
* **Scaling:** `arch` is fit to `returns * 100` for numerical stability; `omega` is rescaled by
  `100²` before being returned so parameters are on the native-return scale.
* **Specs:**
  `GARCH` → `arch_model(mean="Constant", vol="GARCH", p=1, q=1)`;
  `EGARCH` → `vol="EGARCH", o=1`;
  `GJR` → `vol="GARCH", o=1`. Distributions: `normal | t | skewt`.
* **Threadpool:** `arch` is synchronous, so each fit is dispatched through `asyncio.to_thread` to
  keep the FastAPI event loop responsive. The 9-cell grid runs the 9 fits concurrently.
* **Backtests:** distribution-free — empirical quantile of standardized residuals defines the VaR
  threshold. Kupiec POF tests unconditional coverage; Christoffersen tests violation independence
  (transition-probability LR). Pass ⇔ p > 0.05.

## Design system parity

The frontend mirrors these resources from `/Users/Development/interface`:

* `src/assets/fonts/Pinto-*.woff2` + `Roboto-Light.ttf` — copied verbatim.
* `tailwind.config.js` — identical breakpoints, color palette (`pinto.*`), typography scale,
  weight scale, letter-spacing tokens, radii and the `pinto-*` text-utility plugin.
* `src/index.css` — CSS variables, `@font-face` declarations, the `bg-gradient-light` component,
  and the 75 % font-size scaling rule used between 768 px and 1600 px.
* `src/utils/theme/theme.text.ts` → `src/lib/theme.ts` — the `deriveTextStyles(variant)` helper.
* Radix-based shadcn-style primitives — re-implemented as minimal wrappers matching the Pinto
  visual language (borders, shadows, focus rings, hover states).
