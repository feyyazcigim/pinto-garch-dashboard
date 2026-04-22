import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";
import { deriveTextStyles } from "@/lib/theme";

const outlineBase =
  "border border-pinto-gray-2 bg-pinto-gray-1 shadow-sm hover:bg-pinto-gray-2/50 hover:text-pinto-gray-5";

const buttonVariants = cva(
  "box-border relative overflow-hidden inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:bg-pinto-gray-2 disabled:text-pinto-gray-4",
  {
    variants: {
      variant: {
        default: "bg-pinto-green-4 text-white hover:bg-pinto-green-4/90 transition-all",
        defaultAlt: "bg-pinto-green-1 text-pinto-green hover:bg-pinto-green-1/80 transition-all",
        outline: outlineBase,
        "outline-primary": `${outlineBase} text-pinto-green hover:text-pinto-green`,
        "outline-white":
          "border border-pinto-gray-2 bg-white hover:bg-pinto-gray-2/40 hover:text-pinto-gray-5",
        ghost: "hover:bg-pinto-gray-2/50 disabled:text-pinto-gray-4 disabled:bg-transparent",
        link: "text-pinto-gray-4 underline-offset-4 hover:text-pinto-green-4 hover:underline",
      },
      size: {
        default: `h-10 px-4 py-2 ${deriveTextStyles("body-light")}`,
        sm: `h-8 rounded-md px-3 ${deriveTextStyles("xs")}`,
        md: `h-10 px-4 py-2 ${deriveTextStyles("sm")}`,
        lg: "h-12 rounded-md px-6",
        icon: "h-9 w-9",
      },
      width: { default: "w-max", full: "w-full" },
    },
    defaultVariants: { variant: "default", size: "default", width: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, width, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, width }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
