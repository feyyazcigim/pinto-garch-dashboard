import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompareRow, Dist, Spec } from "@/lib/api";
import { fmtNumber } from "@/lib/format";
import { DIST_LABELS, SPEC_LABELS } from "@/components/controls/ModelSelect";

interface Props {
  rows: CompareRow[];
  spec: Spec;
  dist: Dist;
  labelMap: Record<string, string>;
}

export function CrossAssetTable({ rows, spec, dist, labelMap }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cross-asset comparison</CardTitle>
        <CardDescription>
          {SPEC_LABELS[spec]} · {DIST_LABELS[dist]} innovations — same model fitted to every asset
          independently.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>n</TableHead>
              <TableHead>Log-lik</TableHead>
              <TableHead>AIC</TableHead>
              <TableHead>ω</TableHead>
              <TableHead>α₁</TableHead>
              <TableHead>β₁</TableHead>
              <TableHead>γ₁</TableHead>
              <TableHead>Persist.</TableHead>
              <TableHead>VaR₉₅</TableHead>
              <TableHead>VaR₉₉</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.asset}>
                <TableCell className="pinto-sm-bold text-pinto-gray-5">
                  {labelMap[r.asset] ?? r.asset}
                </TableCell>
                <TableCell className="font-menlo">{r.n}</TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.loglik, 2)}</TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.aic, 2)}</TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.omega, 6)}</TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.alpha, 4)}</TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.beta, 4)}</TableCell>
                <TableCell className="font-menlo">
                  {r.gamma != null ? fmtNumber(r.gamma, 4) : "—"}
                </TableCell>
                <TableCell className="font-menlo">{fmtNumber(r.persistence, 4)}</TableCell>
                <TableCell>
                  <CompactPair kup={r.kupiec_95_pass} chr={r.christoffersen_95_pass} />
                </TableCell>
                <TableCell>
                  <CompactPair kup={r.kupiec_99_pass} chr={r.christoffersen_99_pass} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function CompactPair({ kup, chr }: { kup: boolean; chr: boolean }) {
  return (
    <div className="flex gap-1">
      <Badge variant={kup ? "success" : "error"} title="Kupiec">
        K
      </Badge>
      <Badge variant={chr ? "success" : "error"} title="Christoffersen">
        C
      </Badge>
    </div>
  );
}
