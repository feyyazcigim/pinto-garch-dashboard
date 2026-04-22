export function fmtNumber(v: number, digits = 4): string {
  if (!Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  if (abs === 0) return "0";
  if (abs < 1e-4 || abs >= 1e6) return v.toExponential(2);
  return v.toFixed(digits);
}

export function fmtPct(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function fmtPValue(p: number): string {
  if (!Number.isFinite(p)) return "—";
  if (p < 0.001) return p.toExponential(1);
  return p.toFixed(3);
}
