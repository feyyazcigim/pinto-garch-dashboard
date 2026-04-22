import type { FitResult } from "@/lib/api";
import { LineChart } from "./LineChart";

interface Props {
  fit: FitResult;
  annualized?: boolean;
  height?: number;
}

export function CondVolChart({ fit, annualized = true, height = 320 }: Props) {
  const points = annualized ? fit.conditional_vol_annualized : fit.conditional_vol;
  return (
    <LineChart
      height={height}
      yLabel={annualized ? "σ · √365" : "σ (daily)"}
      series={[
        {
          points,
          color: "#387F5C",
          kind: "area",
          label: annualized ? "Conditional volatility (annualized)" : "Conditional volatility (daily)",
          lineWidth: 2,
        },
      ]}
      yFormatter={(v) => (annualized ? `${(v * 100).toFixed(1)}%` : v.toFixed(4))}
    />
  );
}
