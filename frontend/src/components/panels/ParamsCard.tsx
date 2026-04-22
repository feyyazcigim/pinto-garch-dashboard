import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { FitResult } from "@/lib/api";
import { fmtNumber, fmtPValue } from "@/lib/format";

const PARAM_LABELS: Record<string, { greek: string; desc: string }> = {
  mu: { greek: "μ", desc: "Conditional mean" },
  omega: { greek: "ω", desc: "Variance intercept" },
  "alpha[1]": { greek: "α₁", desc: "ARCH coefficient (shock impact)" },
  "beta[1]": { greek: "β₁", desc: "GARCH coefficient (persistence)" },
  "gamma[1]": { greek: "γ₁", desc: "Asymmetry (leverage)" },
  nu: { greek: "ν", desc: "Degrees of freedom (tail thickness)" },
  lambda: { greek: "λ", desc: "Skewness parameter" },
};

function SignificanceBadge({ p }: { p: number }) {
  if (!Number.isFinite(p)) return <Badge variant="muted">—</Badge>;
  if (p < 0.01) return <Badge variant="success">***</Badge>;
  if (p < 0.05) return <Badge variant="success">**</Badge>;
  if (p < 0.1) return <Badge variant="warning">*</Badge>;
  return <Badge variant="muted">n.s.</Badge>;
}

export function ParamsCard({ fit }: { fit: FitResult }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div>
            <CardTitle>Estimated parameters</CardTitle>
            <CardDescription>
              {fit.spec} · {fit.dist} innovations · n = {fit.n}
            </CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
            <Metric label="Log-lik" value={fmtNumber(fit.loglik, 2)} />
            <Metric label="AIC" value={fmtNumber(fit.aic, 2)} />
            <Metric label="BIC" value={fmtNumber(fit.bic, 2)} />
            <Metric label="Persist." value={fmtNumber(fit.persistence, 4)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">Param</TableHead>
              <TableHead>Estimate</TableHead>
              <TableHead className="hidden sm:table-cell">Std. err.</TableHead>
              <TableHead className="hidden md:table-cell">t-stat</TableHead>
              <TableHead>p-value</TableHead>
              <TableHead className="text-right pr-4">Sig.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fit.params.map((p) => {
              const meta = PARAM_LABELS[p.name] ?? { greek: p.name, desc: p.name };
              return (
                <TableRow key={p.name}>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-menlo pinto-sm">{meta.greek}</span>
                      </TooltipTrigger>
                      <TooltipContent>{meta.desc}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-menlo">
                    <span>{fmtNumber(p.value, 6)}</span>
                    {/* On mobile, stack std-err under estimate instead of hiding it. */}
                    <span className="block text-[0.7rem] text-pinto-gray-4 sm:hidden">
                      ± {fmtNumber(p.std_err, 6)}
                    </span>
                  </TableCell>
                  <TableCell className="font-menlo text-pinto-gray-4 hidden sm:table-cell">
                    ± {fmtNumber(p.std_err, 6)}
                  </TableCell>
                  <TableCell className="font-menlo hidden md:table-cell">
                    {fmtNumber(p.t_stat, 3)}
                  </TableCell>
                  <TableCell className="font-menlo">{fmtPValue(p.p_value)}</TableCell>
                  <TableCell className="text-right pr-4">
                    <SignificanceBadge p={p.p_value} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start sm:items-end">
      <span className="pinto-xs text-pinto-gray-4">{label}</span>
      <span className="pinto-sm-bold font-menlo text-pinto-gray-5">{value}</span>
    </div>
  );
}
