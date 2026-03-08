import type { PropsWithChildren } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { cn } from "@/lib/utils";

type AppShellProps = PropsWithChildren<{
  className?: string;
  hideBottomNav?: boolean;
  disableBottomPadding?: boolean;
}>;

export function AppShell({
  children,
  className,
  hideBottomNav = false,
  disableBottomPadding = false,
}: AppShellProps) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[430px] bg-white shadow-[0_0_0_1px_rgba(17,17,17,0.04)]">
      <div className={cn("relative min-h-dvh bg-[linear-gradient(180deg,#f8f8f6_0%,#f5f4ef_100%)]", className)}>
        <div
          className={cn(
            "min-h-dvh",
            hideBottomNav || disableBottomPadding ? "pb-0" : "pb-24",
          )}
        >
          {children}
        </div>
        {hideBottomNav ? null : <BottomNav />}
      </div>
    </div>
  );
}
