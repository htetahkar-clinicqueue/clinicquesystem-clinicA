import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-base font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-clinic-primary/40 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] select-none",
  {
    variants: {
      variant: {
        default:
          "bg-clinic-primary text-white hover:bg-clinic-hover shadow-md hover:shadow-lg border-2 border-transparent",
        destructive:
          "bg-red-700 text-white hover:bg-red-800 shadow-sm border-2 border-transparent",
        outline:
          "border-2 border-slate-900 bg-white text-slate-950 hover:bg-slate-100",
        secondary:
          "bg-slate-100 text-slate-950 hover:bg-slate-200 border-2 border-slate-300",
        success:
          "bg-emerald-700 text-white hover:bg-emerald-800 shadow-md border-2 border-transparent",
        ghost: "text-slate-900 hover:bg-slate-100",
        link: "text-clinic-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[52px] px-6 py-3 text-lg",
        sm: "min-h-[48px] rounded-xl px-4 py-2.5 text-base",
        lg: "min-h-[60px] rounded-2xl px-8 py-4 text-xl",
        xl: "min-h-[72px] rounded-2xl px-10 py-5 text-2xl",
        icon: "min-h-[52px] min-w-[52px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
