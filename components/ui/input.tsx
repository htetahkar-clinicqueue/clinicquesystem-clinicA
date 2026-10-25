import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-h-[56px] w-full rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-xl font-semibold text-slate-950 ring-offset-white file:border-0 file:bg-transparent file:text-base file:font-bold placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-clinic-primary focus-visible:ring-4 focus-visible:ring-clinic-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
