import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "h-11 w-full rounded-[18px] border border-black/6 bg-white/88 px-3 text-sm text-[var(--nugget-text)] placeholder:text-[var(--nugget-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
          className,
        )}
        type={type}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
