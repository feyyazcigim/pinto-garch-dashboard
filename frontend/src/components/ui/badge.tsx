import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 pinto-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-pinto-green-1 text-pinto-green-4",
        success: "border-transparent bg-pinto-green-1 text-pinto-green-4",
        warning: "border-transparent bg-pinto-orange-1 text-pinto-warning-orange",
        error: "border-transparent bg-pinto-red-1 text-pinto-red-2",
        outline: "border border-pinto-gray-2 text-pinto-gray-5",
        muted: "border-transparent bg-pinto-gray-1 text-pinto-gray-5",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
