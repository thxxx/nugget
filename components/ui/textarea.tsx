import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "min-h-[110px] w-full rounded-[18px] border border-black/6 bg-white/88 px-3 py-2 text-sm text-[var(--nugget-text)] placeholder:text-[var(--nugget-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
