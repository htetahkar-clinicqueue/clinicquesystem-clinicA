import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-3.5 py-1 text-sm font-bold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-clinic-primary text-white",
        secondary:
          "border-slate-300 bg-slate-100 text-slate-900",
        success:
          "border-emerald-700 bg-emerald-50 text-emerald-900",
        warning:
          "border-amber-600 bg-amber-50 text-amber-950",
        destructive:
          "border-red-700 bg-red-50 text-red-900",
        outline: "border-slate-800 text-slate-950 bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
