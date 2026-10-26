import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[140px] w-full border-b border-border-strong bg-transparent px-0 py-3 font-sans text-base leading-relaxed text-foreground transition-colors duration-300",
          "placeholder:text-foreground-muted",
          "focus:border-gold focus:outline-2 focus:outline-gold focus:outline-offset-4",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
