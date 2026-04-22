import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GridRow } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtNumber, fmtPValue } from "@/lib/format";

type SortKey = "aic" | "bic" | "loglik" | "persistence";

interface Props {
  rows: GridRow[];
  best: GridRow | null;
}

export function ModelGridTable({ rows, best }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("aic");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (!Number.isFinite(va)) return 1;
      if (!Number.isFinite(vb)) return -1;
      return va - vb;
    });
  }, [rows, sortKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>All 9 model × distribution fits</CardTitle>
        <CardDescription>
          Lower AIC / BIC is better. The highlighted row is the AIC-minimizing spec and is treated
          as the best model for this asset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spec</TableHead>
              <TableHead>Dist.</TableHead>
              <SortableHead k="loglik" sortKey={sortKey} onSort={setSortKey}>
                Log-lik
              </SortableHead>
              <SortableHead k="aic" sortKey={sortKey} onSort={setSortKey}>
                AIC
              </SortableHead>
              <SortableHead k="bic" sortKey={sortKey} onSort={setSortKey}>
                BIC
              </SortableHead>
              <SortableHead k="persistence" sortKey={sortKey} onSort={setSortKey}>
                Persist.
              </SortableHead>
              <TableHead>Kupiec₉₅ (p)</TableHead>
              <TableHead>Chr.₉₅ (p)</TableHead>
              <TableHead>Converged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((r) => {
              const isBest = best && best.spec === r.spec && best.dist === r.dist;
              return (
                <TableRow
                  key={`${r.spec}-${r.dist}`}
                  className={cn(isBest && "bg-pinto-green-1/50")}
                >
                  <TableCell className="pinto-sm text-pinto-gray-5">
                    {r.spec}
                    {isBest && (
                      <Badge className="ml-2" variant="success">
                        best
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-menlo pinto-sm">{r.dist}</TableCell>
                  <TableCell className="font-menlo">{fmtNumber(r.loglik, 2)}</TableCell>
                  <TableCell className="font-menlo">{fmtNumber(r.aic, 2)}</TableCell>
                  <TableCell className="font-menlo">{fmtNumber(r.bic, 2)}</TableCell>
                  <TableCell className="font-menlo">{fmtNumber(r.persistence, 4)}</TableCell>
                  <TableCell className="font-menlo">{fmtPValue(r.kupiec_95_p)}</TableCell>
                  <TableCell className="font-menlo">{fmtPValue(r.christoffersen_95_p)}</TableCell>
                  <TableCell>
                    <Badge variant={r.converged ? "success" : "error"}>
                      {r.converged ? "yes" : "no"}
                    </Badge>
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

function SortableHead({
  children,
  k,
  sortKey,
  onSort,
}: {
  children: React.ReactNode;
  k: SortKey;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <TableHead
      onClick={() => onSort(k)}
      className={cn(
        "cursor-pointer select-none hover:text-pinto-green-4 transition-colors",
        active && "text-pinto-green-4",
      )}
    >
      {children}
      {active && " ↑"}
    </TableHead>
  );
}
