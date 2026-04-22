import type { FitResult, SeriesPoint } from "@/lib/api";
import { LineChart } from "./LineChart";

interface Props {
  fit: FitResult;
  height?: number;
}

export function ResidualsChart({ fit, height = 320 }: Props) {
  const upper: SeriesPoint[] = fit.std_resid.map((p) => ({ date: p.date, value: 2 }));
  const lower: SeriesPoint[] = fit.std_resid.map((p) => ({ date: p.date, value: -2 }));
  return (
    <LineChart
      height={height}
      yLabel="z_t = ε_t / σ_t"
      yFormatter={(v) => v.toFixed(2)}
      series={[
        {
          points: fit.std_resid,
          color: "#246645",
          kind: "line",
          label: "Standardized residual",
          lineWidth: 1.5,
        },
        {
          points: upper,
          color: "#DCB505",
          kind: "line",
          label: "+2σ",
          lineWidth: 1,
          dashed: true,
        },
        {
          points: lower,
          color: "#DCB505",
          kind: "line",
          label: "−2σ",
          lineWidth: 1,
          dashed: true,
        },
      ]}
    />
  );
}
