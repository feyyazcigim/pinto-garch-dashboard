/**
 * API client — thin fetch wrapper. The Vite dev server proxies `/api/*`
 * to the FastAPI backend (see vite.config.ts).
 */

export type Spec = "GARCH" | "EGARCH" | "GJR";
export type Dist = "normal" | "t" | "skewt";

export interface AssetMeta {
  id: string;
  label: string;
  is_peg: boolean;
}

export interface Meta {
  assets: AssetMeta[];
  specs: Spec[];
  dists: Dist[];
  min_date: string;
  max_date: string;
}

export interface Param {
  name: string;
  value: number;
  std_err: number;
  t_stat: number;
  p_value: number;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Backtest {
  alpha: number;
  violations: number;
  n: number;
  kupiec_stat: number;
  kupiec_p: number;
  kupiec_pass: boolean;
  christoffersen_stat: number;
  christoffersen_p: number;
  christoffersen_pass: boolean;
}

export interface FitResult {
  asset: string;
  spec: Spec;
  dist: Dist;
  start: string;
  end: string;
  n: number;
  converged: boolean;
  error: string;
  loglik: number;
  aic: number;
  bic: number;
  persistence: number;
  params: Param[];
  conditional_vol: SeriesPoint[];
  conditional_vol_annualized: SeriesPoint[];
  std_resid: SeriesPoint[];
  returns: SeriesPoint[];
  backtests: Record<"0.05" | "0.01", Backtest>;
}

export interface GridRow {
  spec: Spec;
  dist: Dist;
  n: number;
  converged: boolean;
  error: string;
  loglik: number;
  aic: number;
  bic: number;
  persistence: number;
  omega: number;
  alpha: number;
  beta: number;
  gamma: number | null;
  nu: number | null;
  lam: number | null;
  kupiec_95_p: number;
  christoffersen_95_p: number;
  kupiec_99_p: number;
  christoffersen_99_p: number;
}

export interface GridResult {
  asset: string;
  start: string;
  end: string;
  rows: GridRow[];
  best: GridRow | null;
}

export interface CompareRow {
  asset: string;
  n: number;
  converged: boolean;
  error: string;
  aic: number;
  bic: number;
  loglik: number;
  persistence: number;
  omega: number;
  alpha: number;
  beta: number;
  gamma: number | null;
  nu: number | null;
  lam: number | null;
  kupiec_95_pass: boolean;
  christoffersen_95_pass: boolean;
  kupiec_99_pass: boolean;
  christoffersen_99_pass: boolean;
}

export interface CompareResult {
  spec: Spec;
  dist: Dist;
  start: string;
  end: string;
  rows: CompareRow[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail: string;
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status} ${path}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => request<Meta>("/api/assets"),

  fit: (body: { asset: string; spec: Spec; dist: Dist; start?: string; end?: string }) =>
    request<FitResult>("/api/garch/fit", { method: "POST", body: JSON.stringify(body) }),

  grid: (body: { asset: string; start?: string; end?: string }) =>
    request<GridResult>("/api/garch/grid", { method: "POST", body: JSON.stringify(body) }),

  compare: (body: { assets: string[]; spec: Spec; dist: Dist; start?: string; end?: string }) =>
    request<CompareResult>("/api/garch/compare", { method: "POST", body: JSON.stringify(body) }),
};
