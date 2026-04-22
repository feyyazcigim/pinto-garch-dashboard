import { useQuery } from "@tanstack/react-query";
import { api, type Dist, type Spec } from "@/lib/api";

export function useGarchFit(params: {
  asset: string;
  spec: Spec;
  dist: Dist;
  start?: string;
  end?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...body } = params;
  return useQuery({
    queryKey: ["garch-fit", body],
    queryFn: () => api.fit(body),
    enabled: enabled && !!body.asset && !!body.spec && !!body.dist,
  });
}

export function useGarchGrid(params: { asset: string; start?: string; end?: string; enabled?: boolean }) {
  const { enabled = true, ...body } = params;
  return useQuery({
    queryKey: ["garch-grid", body],
    queryFn: () => api.grid(body),
    enabled: enabled && !!body.asset,
  });
}

export function useGarchCompare(params: {
  assets: string[];
  spec: Spec;
  dist: Dist;
  start?: string;
  end?: string;
  enabled?: boolean;
}) {
  const { enabled = true, ...body } = params;
  return useQuery({
    queryKey: ["garch-compare", body],
    queryFn: () => api.compare(body),
    enabled: enabled && body.assets.length > 0,
  });
}
