import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AssetMeta } from "@/lib/api";

interface Props {
  assets: AssetMeta[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
  loading?: boolean;
}

export function AssetSelect({ assets, value, onChange, label = "Asset", loading = false }: Props) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <Label>{label}</Label>
      {loading ? (
        <div className="flex h-10 w-full items-center justify-between rounded-md border border-pinto-gray-2 bg-pinto-gray-1 px-3 py-2">
          <span className="pinto-sm-light text-pinto-gray-4">Loading assets…</span>
          <LoadingSpinner size={16} />
        </div>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select asset" />
          </SelectTrigger>
          <SelectContent>
            {assets.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span className="flex items-center gap-2">
                  <span>{a.label}</span>
                  <span className="pinto-xs text-pinto-gray-4">
                    {a.is_peg ? "peg" : "non-peg"}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
