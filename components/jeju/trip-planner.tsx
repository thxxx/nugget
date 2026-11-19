"use client";

import { useEffect } from "react";

import { ItineraryPanel } from "@/components/jeju/itinerary-panel";
import { SavedPanel } from "@/components/jeju/saved-panel";
import { SearchBar, SearchResults, useJejuSearch } from "@/components/jeju/search";
import { TripMap } from "@/components/jeju/trip-map";
import { useTripRoutes, type DayRoute } from "@/lib/jeju/use-trip-routes";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore, type PanelTab } from "@/store/useTripUiStore";

export function TripPlanner() {
  const routes = useTripRoutes();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      useTripUiStore.getState().select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="jeju-root flex h-dvh w-full flex-col overflow-hidden bg-white text-ink lg:flex-row lg:gap-3 lg:p-3">
      <section className="relative h-[46dvh] shrink-0 overflow-hidden lg:h-auto lg:min-w-0 lg:flex-1 lg:rounded-[20px]">
        <TripMap routes={routes} />
      </section>
      <aside className="flex min-h-0 flex-1 flex-col lg:w-[460px] lg:flex-none">
        <SidePanel routes={routes} />
      </aside>
      <ToastHost />
    </div>
  );
}

function SidePanel({ routes }: { routes: DayRoute[] }) {
  const search = useJejuSearch();
  const tab = useTripUiStore((s) => s.tab);
  const setTab = useTripUiStore((s) => s.setTab);
  const select = useTripUiStore((s) => s.select);
  const savedCount = useTripStore((s) => s.savedOrder.length);
  const scheduledCount = routes.reduce((n, r) => n + r.day.placeIds.length, 0);

  return (
    <>
      <div className="px-4 pb-1 pt-4 lg:px-5 lg:pt-3">
        <SearchBar
          query={search.query}
          setQuery={search.setQuery}
          loading={search.active && search.loading}
          onEnter={() => {
            if (search.items[0]) select(search.items[0]);
          }}
        />
      </div>

      {search.active ? (
        <div className="jeju-scroll min-h-0 flex-1 overflow-y-auto">
          <SearchResults search={search} />
        </div>
      ) : (
        <>
          <nav className="mt-3 flex gap-7 border-b border-line-soft px-7" role="tablist">
            <TabButton id="saved" active={tab === "saved"} onClick={setTab} count={savedCount}>
              담은 곳
            </TabButton>
            <TabButton id="trip" active={tab === "trip"} onClick={setTab} count={scheduledCount}>
              여행 일정
            </TabButton>
          </nav>
          <div className="jeju-scroll min-h-0 flex-1 overflow-y-auto">
            {tab === "saved" ? (
              <SavedPanel onSuggest={search.setQuery} />
            ) : (
              <ItineraryPanel routes={routes} />
            )}
          </div>
        </>
      )}
    </>
  );
}

function TabButton({
  id,
  active,
  onClick,
  count,
  children,
}: {
  id: PanelTab;
  active: boolean;
  onClick: (id: PanelTab) => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onClick(id)}
      className={cn(
        "relative -mb-px flex h-12 items-center gap-1.5 border-b-2 text-[15px] font-semibold transition",
        active ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink",
      )}
    >
      {children}
      {count > 0 ? (
        <span
          className={cn(
            "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold",
            active ? "bg-ink text-white" : "bg-surface-strong text-ink-muted",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function ToastHost() {
  const toast = useTripUiStore((s) => s.toast);
  const hideToast = useTripUiStore((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(hideToast, toast.onAction ? 4500 : 2400);
    return () => window.clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[1100] flex justify-center px-4">
      <div
        key={toast.id}
        role="status"
        className="jeju-rise pointer-events-auto flex max-w-[460px] items-center gap-4 rounded-full bg-ink py-2.5 pl-5 pr-2.5 text-[14px] font-medium text-white shadow-air-lg"
      >
        <span className="min-w-0 truncate">{toast.message}</span>
        {toast.actionLabel ? (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              hideToast();
            }}
            className="shrink-0 rounded-full bg-white/12 px-3 py-1 text-[13px] font-semibold text-white transition hover:bg-white/20"
          >
            {toast.actionLabel}
          </button>
        ) : (
          <span className="w-1" />
        )}
      </div>
    </div>
  );
}
