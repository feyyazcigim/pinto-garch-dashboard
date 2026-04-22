import {
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  TimeScale,
  Tooltip,
} from "chart.js";
import "chartjs-adapter-date-fns";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

import type { SeriesPoint } from "@/lib/api";

ChartJS.register(
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
);

export interface LineChartSeries {
  points: SeriesPoint[];
  color: string;
  label: string;
  kind?: "line" | "area";
  dashed?: boolean;
  lineWidth?: number;
}

interface Props {
  series: LineChartSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  yLabel?: string;
}

function hexWithAlpha(hex: string, alpha: number): string {
  // Supports #RRGGBB and #RGB.
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function LineChart({ series, height = 320, yFormatter, yLabel }: Props) {
  const data = useMemo(
    () => ({
      datasets: series.map((s) => {
        const isArea = s.kind === "area";
        return {
          label: s.label,
          data: s.points
            .filter((p) => Number.isFinite(p.value))
            .map((p) => ({ x: p.date, y: p.value })),
          borderColor: s.color,
          backgroundColor: isArea
            ? (ctx: { chart: ChartJS }) => {
                const canvas = ctx.chart.ctx;
                if (!canvas) return hexWithAlpha(s.color, 0.18);
                const { chartArea } = ctx.chart;
                if (!chartArea) return hexWithAlpha(s.color, 0.18);
                const grad = canvas.createLinearGradient(
                  0,
                  chartArea.top,
                  0,
                  chartArea.bottom,
                );
                grad.addColorStop(0, hexWithAlpha(s.color, 0.35));
                grad.addColorStop(1, hexWithAlpha(s.color, 0));
                return grad;
              }
            : hexWithAlpha(s.color, 0),
          borderWidth: s.lineWidth ?? 2,
          borderDash: s.dashed ? [4, 4] : undefined,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: s.color,
          pointHoverBorderColor: "#FFFFFF",
          pointHoverBorderWidth: 2,
          tension: 0.15,
          fill: isArea,
          cubicInterpolationMode: "monotone" as const,
        };
      }),
    }),
    [series],
  );

  const options: ChartOptions<"line"> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: series.length > 1,
          position: "top",
          align: "end",
          labels: {
            color: "#6E6E6E",
            font: { family: "Pinto, system-ui, sans-serif", size: 12, weight: 340 },
            boxWidth: 14,
            boxHeight: 2,
            usePointStyle: false,
          },
        },
        tooltip: {
          backgroundColor: "#FFFFFF",
          borderColor: "#D9D9D9",
          borderWidth: 1,
          titleColor: "#404040",
          titleFont: {
            family: "Pinto, system-ui, sans-serif",
            size: 12,
            weight: 500,
          },
          bodyColor: "#404040",
          bodyFont: {
            family: "Menlo, Monaco, monospace",
            size: 12,
          },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              if (v == null || !Number.isFinite(v)) return `${ctx.dataset.label}: —`;
              const formatted = yFormatter ? yFormatter(v) : v.toFixed(4);
              return `${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "time",
          time: { unit: "month", tooltipFormat: "yyyy-MM-dd" },
          grid: { color: "rgba(217, 217, 217, 0.3)" },
          border: { color: "#D9D9D9" },
          ticks: {
            color: "#9C9C9C",
            font: { family: "Pinto, system-ui, sans-serif", size: 11 },
            maxRotation: 0,
            autoSkipPadding: 24,
          },
        },
        y: {
          grid: { color: "rgba(217, 217, 217, 0.3)" },
          border: { color: "#D9D9D9" },
          ticks: {
            color: "#9C9C9C",
            font: { family: "Menlo, Monaco, monospace", size: 11 },
            callback: (value) => (yFormatter ? yFormatter(Number(value)) : Number(value).toFixed(4)),
          },
          title: yLabel
            ? {
                display: true,
                text: yLabel,
                color: "#6E6E6E",
                font: { family: "Pinto, system-ui, sans-serif", size: 11, weight: 340 },
              }
            : undefined,
        },
      },
    }),
    [series.length, yFormatter, yLabel],
  );

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}
