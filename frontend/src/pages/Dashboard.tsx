import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import { CondVolChart } from "@/components/charts/CondVolChart";
import { ResidualsChart } from "@/components/charts/ResidualsChart";
import { AssetSelect } from "@/components/controls/AssetSelect";
import { DateRangePicker } from "@/components/controls/DateRangePicker";
import { DistSelect, ModelSelect } from "@/components/controls/ModelSelect";
import { CenteredSpinner, LoadingSpinner } from "@/components/LoadingSpinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrossAssetTable } from "@/components/panels/CrossAssetTable";
import { ModelGridTable } from "@/components/panels/ModelGridTable";
import { ParamsCard } from "@/components/panels/ParamsCard";
import { VaRBacktestPanel } from "@/components/panels/VaRBacktestPanel";
import { useGarchCompare, useGarchFit, useGarchGrid } from "@/hooks/useGarchFit";
import { useMeta } from "@/hooks/useMeta";
import type { Dist, Spec } from "@/lib/api";

export function Dashboard() {
  const meta = useMeta();

  const [asset, setAsset] = useState<string>("pinto");
  const [spec, setSpec] = useState<Spec>("GARCH");
  const [dist, setDist] = useState<Dist>("t");
  const [range, setRange] = useState({ start: "", end: "" });

  const assets = meta.data?.assets ?? [];
  const assetLabelMap = useMemo(
    () => Object.fromEntries(assets.map((a) => [a.id, a.label])),
    [assets],
  );

  const defaultStart = meta.data?.min_date ?? "";
  const defaultEnd = meta.data?.max_date ?? "";
  const start = range.start || defaultStart;
  const end = range.end || defaultEnd;

  const fit = useGarchFit({
    asset,
    spec,
    dist,
    start: start || undefined,
    end: end || undefined,
    enabled: !!asset && !meta.isLoading,
  });

  const grid = useGarchGrid({
    asset,
    start: start || undefined,
    end: end || undefined,
    enabled: !!asset && !meta.isLoading,
  });

  const compare = useGarchCompare({
    assets: assets.map((a) => a.id),
    spec,
    dist,
    start: start || undefined,
    end: end || undefined,
    enabled: assets.length > 0,
  });

  return (
    <div className="min-h-screen w-full">
      <Header />

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-4 sm:px-6">
        <ControlsBar
          assets={assets}
          assetsLoading={meta.isLoading}
          asset={asset}
          setAsset={setAsset}
          spec={spec}
          setSpec={setSpec}
          dist={dist}
          setDist={setDist}
          range={{ start, end }}
          setRange={setRange}
          minDate={defaultStart}
          maxDate={defaultEnd}
        />

        {meta.isError && (
          <ErrorBanner message={`Couldn't load asset metadata: ${(meta.error as Error).message}`} />
        )}

        <Tabs defaultValue="fit" className="mt-6">
          <TabsList>
            <TabsTrigger value="fit">Fit</TabsTrigger>
            <TabsTrigger value="models">Model comparison</TabsTrigger>
            <TabsTrigger value="cross">Cross-asset</TabsTrigger>
          </TabsList>

          <TabsContent value="fit">
            {fit.isError ? (
              <ErrorBanner message={(fit.error as Error).message} />
            ) : fit.isLoading || !fit.data ? (
              <CenteredSpinner label={`Fitting ${spec} · ${dist} for ${asset}…`} minHeight={520} />
            ) : !fit.data.converged ? (
              <ErrorBanner message={`Model failed to converge: ${fit.data.error || "unknown error"}`} />
            ) : (
              <FitView fit={fit.data} refetching={fit.isFetching} />
            )}
          </TabsContent>

          <TabsContent value="models">
            {grid.isError ? (
              <ErrorBanner message={(grid.error as Error).message} />
            ) : grid.isLoading || !grid.data ? (
              <CenteredSpinner label={`Fitting all 9 models for ${asset}…`} minHeight={440} />
            ) : (
              <ModelGridTable rows={grid.data.rows} best={grid.data.best} />
            )}
          </TabsContent>

          <TabsContent value="cross">
            {compare.isError ? (
              <ErrorBanner message={(compare.error as Error).message} />
            ) : compare.isLoading || !compare.data ? (
              <CenteredSpinner
                label={`Fitting ${spec} · ${dist} across ${assets.length || "all"} assets…`}
                minHeight={440}
              />
            ) : (
              <CrossAssetTable
                rows={compare.data.rows}
                spec={compare.data.spec}
                dist={compare.data.dist}
                labelMap={assetLabelMap}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="w-full border-b border-pinto-gray-2/60 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-0.5">
          <span className="pinto-h4 text-pinto-gray-5 sm:pinto-h3">Pinto GARCH Dashboard</span>
          <span className="pinto-xs text-pinto-gray-4 sm:pinto-sm-light">
            Interactive volatility modeling
          </span>
        </div>
      </div>
    </header>
  );
}

function ControlsBar(props: {
  assets: { id: string; label: string; is_peg: boolean }[];
  assetsLoading: boolean;
  asset: string;
  setAsset: (v: string) => void;
  spec: Spec;
  setSpec: (v: Spec) => void;
  dist: Dist;
  setDist: (v: Dist) => void;
  range: { start: string; end: string };
  setRange: (v: { start: string; end: string }) => void;
  minDate?: string;
  maxDate?: string;
}) {
  return (
    <Card className="sm:sticky sm:top-4 sm:z-10">
      <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-4 lg:flex lg:flex-wrap lg:items-end">
        <AssetSelect
          assets={props.assets}
          value={props.asset}
          onChange={props.setAsset}
          loading={props.assetsLoading}
        />
        <ModelSelect value={props.spec} onChange={props.setSpec} />
        <DistSelect value={props.dist} onChange={props.setDist} />
        <DateRangePicker
          value={props.range}
          onChange={props.setRange}
          min={props.minDate}
          max={props.maxDate}
        />
      </CardContent>
    </Card>
  );
}

function FitView({
  fit,
  refetching,
}: {
  fit: import("@/lib/api").FitResult;
  refetching: boolean;
}) {
  return (
    <div className="relative">
      {refetching && (
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-2 rounded-full border border-pinto-gray-2 bg-white/90 px-3 py-1 shadow-sm">
          <LoadingSpinner size={14} />
          <span className="pinto-xs text-pinto-gray-5">updating…</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ParamsCard fit={fit} />
        <VaRBacktestPanel fit={fit} />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Conditional volatility</CardTitle>
            <CardDescription>σ̂_t from the fitted process, annualized by √365.</CardDescription>
          </CardHeader>
          <CardContent>
            <CondVolChart fit={fit} annualized height={320} />
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Standardized residuals</CardTitle>
            <CardDescription>
              z_t = ε_t / σ̂_t. A well-specified model produces residuals within ±2σ ~95% of the
              time and shows no clustering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResidualsChart fit={fit} height={320} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <Card className="border-pinto-red-2/30 bg-pinto-red-1/30 my-4">
      <CardContent className="flex items-start gap-3 p-4">
        <AlertCircle className="h-5 w-5 text-pinto-red-2 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="pinto-sm-bold text-pinto-red-2">Error</span>
          <span className="pinto-sm-light text-pinto-gray-5">{message}</span>
        </div>
      </CardContent>
    </Card>
  );
}
