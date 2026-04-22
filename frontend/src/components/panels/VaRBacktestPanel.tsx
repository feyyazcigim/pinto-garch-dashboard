import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Backtest, FitResult } from "@/lib/api";
import { fmtNumber, fmtPValue } from "@/lib/format";

function TestRow({ name, b, desc }: { name: string; b: Backtest; desc: string }) {
  const kupPass = b.kupiec_pass;
  const chrPass = b.christoffersen_pass;
  return (
    <div className="grid grid-cols-[140px_1fr_1fr] gap-3 items-center py-2 border-b border-pinto-gray-2/50 last:border-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="pinto-sm text-pinto-gray-5 cursor-help">{name}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{desc}</TooltipContent>
      </Tooltip>
      <TestCell label="Kupiec POF" pass={kupPass} stat={b.kupiec_stat} p={b.kupiec_p} />
      <TestCell
        label="Christoffersen ind."
        pass={chrPass}
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
    <div className="flex items-center gap-3">
      <Badge variant={pass ? "success" : "error"}>{pass ? "PASS" : "FAIL"}</Badge>
      <div className="flex flex-col leading-tight">
        <span className="pinto-xs text-pinto-gray-4">{label}</span>
        <span className="pinto-xs font-menlo text-pinto-gray-5">
          LR = {fmtNumber(stat, 2)} · p = {fmtPValue(p)}
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
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 pinto-xs text-pinto-gray-4">
          {b95 && (
            <span>
              95% observed violations: <span className="font-menlo">{b95.violations}</span> /{" "}
              {b95.n} (
              <span className="font-menlo">
                {((b95.violations / Math.max(b95.n, 1)) * 100).toFixed(1)}%
              </span>
              )
            </span>
          )}
          {b99 && (
            <span>
              99% observed violations: <span className="font-menlo">{b99.violations}</span> /{" "}
              {b99.n} (
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
