import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "h-14 w-full border-b border-border-strong bg-transparent px-0 py-3 font-sans text-base text-foreground transition-colors duration-300",
          "placeholder:text-foreground-muted",
          "focus:border-gold focus:outline-2 focus:outline-gold focus:outline-offset-4",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
