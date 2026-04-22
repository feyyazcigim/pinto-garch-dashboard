/**
 * Typography helpers — mirror the variant system from
 * `/Users/Development/interface/src/utils/theme/theme.text.ts` so that
 * Pinto's h1…h4 / body / body-light / sm / xs sizes, weights, line
 * heights and tracking stay in lockstep with the main app.
 */

export type FontVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "lg"
  | "body"
  | "body-light"
  | "body-bold"
  | "sm"
  | "sm-light"
  | "sm-bold"
  | "xs"
  | "inherit";

type SizeKey = "xs" | "sm" | "body" | "h4" | "h3" | "h2" | "h1" | "inherit";
type LineHeightKey = Exclude<SizeKey, "inherit"> | "inherit";
type WeightKey = "thin" | "light" | "regular" | "medium" | "inherit";
type TrackingKey = "body-light" | "h2" | "h3" | "h4" | "none" | "inherit";

const SIZE: Record<SizeKey, string> = {
  xs: "text-[0.875rem]",
  sm: "text-[1rem]",
  body: "text-[1.25rem]",
  h4: "text-[1.5rem]",
  h3: "text-[1.75rem] sm:text-[2rem]",
  h2: "text-[2.25rem]",
  h1: "text-[3.429rem]",
  inherit: "text-inherit",
};

const LINE_HEIGHT: Record<LineHeightKey, string> = {
  xs: "leading-[.9625rem]",
  sm: "leading-[1.1rem]",
  body: "leading-[1.375rem]",
  h4: "leading-[1.65rem]",
  h3: "leading-[2.2rem]",
  h2: "leading-[2.475rem]",
  h1: "leading-[3.772rem]",
  inherit: "leading-inherit",
};

const WEIGHT: Record<WeightKey, string> = {
  thin: "font-[300]",
  light: "font-[340]",
  regular: "font-[400]",
  medium: "font-[500]",
  inherit: "font-inherit",
};

const TRACKING: Record<TrackingKey, string> = {
  "body-light": "tracking-[-0.025rem]",
  h4: "tracking-[-0.003rem]",
  h3: "tracking-[-0.04rem]",
  h2: "tracking-[-0.0315rem]",
  none: "tracking-[0rem]",
  inherit: "tracking-inherit",
};

const MAP: Record<FontVariant, { size: SizeKey; lh: LineHeightKey; w: WeightKey; tr: TrackingKey }> = {
  h1: { size: "h1", lh: "h1", w: "thin", tr: "none" },
  h2: { size: "h2", lh: "h2", w: "thin", tr: "h2" },
  h3: { size: "h3", lh: "h3", w: "light", tr: "h3" },
  h4: { size: "h4", lh: "h4", w: "regular", tr: "h4" },
  lg: { size: "h4", lh: "body", w: "light", tr: "none" },
  body: { size: "body", lh: "body", w: "regular", tr: "none" },
  "body-light": { size: "body", lh: "body", w: "light", tr: "body-light" },
  "body-bold": { size: "body", lh: "body", w: "medium", tr: "none" },
  sm: { size: "sm", lh: "sm", w: "regular", tr: "none" },
  "sm-light": { size: "sm", lh: "sm", w: "light", tr: "none" },
  "sm-bold": { size: "sm", lh: "sm", w: "medium", tr: "none" },
  xs: { size: "xs", lh: "xs", w: "light", tr: "none" },
  inherit: { size: "inherit", lh: "inherit", w: "inherit", tr: "inherit" },
};

export function deriveTextStyles(variant: FontVariant = "sm"): string {
  const m = MAP[variant];
  return `${SIZE[m.size]} ${LINE_HEIGHT[m.lh]} ${WEIGHT[m.w]} ${TRACKING[m.tr]}`;
}
