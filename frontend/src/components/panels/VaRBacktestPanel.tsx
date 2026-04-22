import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Backtest, FitResult } from "@/lib/api";
import { fmtNumber, fmtPValue } from "@/lib/format";

function TestRow({ name, b, desc }: { name: string; b: Backtest; desc: string }) {
  return (
    <div className="flex flex-col gap-3 py-3 border-b border-pinto-gray-2/50 last:border-0 md:grid md:grid-cols-[140px_1fr_1fr] md:items-center md:gap-4 md:py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="pinto-sm text-pinto-gray-5 cursor-help">{name}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{desc}</TooltipContent>
      </Tooltip>
      <TestCell label="Kupiec POF" pass={b.kupiec_pass} stat={b.kupiec_stat} p={b.kupiec_p} />
      <TestCell
        label="Christoffersen ind."
        pass={b.christoffersen_pass}
        stat={b.christoffersen_stat}
        p={b.christoffersen_p}
      />
    </div>
  );
}

function TestCell({
  label,
  pass,
  stat,
  p,
}: {
  label: string;
  pass: boolean;
  stat: number;
  p: number;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Badge variant={pass ? "success" : "error"} className="flex-shrink-0">
        {pass ? "PASS" : "FAIL"}
      </Badge>
      <div className="flex flex-col leading-tight min-w-0">
        <span className="pinto-xs text-pinto-gray-4 truncate">{label}</span>
        <span className="pinto-xs font-menlo text-pinto-gray-5 whitespace-nowrap">
          LR={fmtNumber(stat, 2)} · p={fmtPValue(p)}
        </span>
      </div>
    </div>
  );
}

export function VaRBacktestPanel({ fit }: { fit: FitResult }) {
  const b95 = fit.backtests["0.05"];
  const b99 = fit.backtests["0.01"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>VaR backtests</CardTitle>
        <CardDescription>
          Distribution-free: empirical quantile of standardized residuals. Pass ⇔ p &gt; 0.05.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {b95 && (
          <TestRow
            name="95% VaR (α = 0.05)"
            b={b95}
            desc="Expected ~5% violations. Kupiec tests unconditional coverage; Christoffersen tests that violations are not clustered in time."
          />
        )}
        {b99 && (
          <TestRow
            name="99% VaR (α = 0.01)"
            b={b99}
            desc="Expected ~1% violations; the 99% VaR is the tail risk most relevant to extreme-loss scenarios."
          />
        )}
        <div className="mt-3 flex flex-col gap-1 pinto-xs text-pinto-gray-4 sm:flex-row sm:flex-wrap sm:gap-x-6">
          {b95 && (
            <span>
              95% violations: <span className="font-menlo">{b95.violations}</span> / {b95.n} (
              <span className="font-menlo">
                {((b95.violations / Math.max(b95.n, 1)) * 100).toFixed(1)}%
              </span>
              )
            </span>
          )}
          {b99 && (
            <span>
              99% violations: <span className="font-menlo">{b99.violations}</span> / {b99.n} (
              <span className="font-menlo">
                {((b99.violations / Math.max(b99.n, 1)) * 100).toFixed(1)}%
              </span>
              )
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
