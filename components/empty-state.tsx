import { SearchX } from "lucide-react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--nugget-border)] bg-[var(--nugget-surface)] p-6 text-center",
        className,
      )}
    >
      <SearchX className="h-5 w-5 text-[var(--nugget-muted)]" />
      <p className="text-sm font-semibold text-[var(--nugget-text)]">{title}</p>
      <p className="text-xs text-[var(--nugget-muted)]">{description}</p>
    </div>
  );
}
