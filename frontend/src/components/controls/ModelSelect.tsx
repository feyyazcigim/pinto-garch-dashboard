import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Dist, Spec } from "@/lib/api";

const SPEC_LABELS: Record<Spec, string> = {
  GARCH: "GARCH(1,1)",
  EGARCH: "EGARCH(1,1)",
  GJR: "GJR-GARCH(1,1)",
};

const DIST_LABELS: Record<Dist, string> = {
  normal: "Normal",
  t: "Student-t",
  skewt: "Skewed-t",
};

export function ModelSelect({ value, onChange }: { value: Spec; onChange: (v: Spec) => void }) {
  return (
    <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
      <Label>Model</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Spec)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SPEC_LABELS) as Spec[]).map((s) => (
            <SelectItem key={s} value={s}>
              {SPEC_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DistSelect({ value, onChange }: { value: Dist; onChange: (v: Dist) => void }) {
  return (
    <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
      <Label>Distribution</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Dist)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(DIST_LABELS) as Dist[]).map((d) => (
            <SelectItem key={d} value={d}>
              {DIST_LABELS[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { SPEC_LABELS, DIST_LABELS };
