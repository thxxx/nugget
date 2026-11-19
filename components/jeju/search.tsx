"use client";

import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PlacePhoto } from "@/components/jeju/place-photo";
import { HeartButton } from "@/components/jeju/primitives";
import { areaOf, shortCategory } from "@/lib/jeju/category";
import { dayColor } from "@/lib/jeju/colors";
import type { Place, SearchResponse } from "@/lib/jeju/types";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore } from "@/store/useTripUiStore";

type SearchState = {
  forQuery: string;
  items: Place[];
  total: number;
  isEnd: boolean;
  page: number;
  loading: boolean;
  error: string | null;
};

const IDLE: SearchState = {
  forQuery: "",
  items: [],
  total: 0,
  isEnd: true,
  page: 1,
  loading: false,
  error: null,
};

async function fetchPage(q: string, page: number, signal?: AbortSignal) {
  const res = await fetch(`/api/jeju/search?q=${encodeURIComponent(q)}&page=${page}`, { signal });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "검색에 실패했어요.");
  }
  return (await res.json()) as SearchResponse;
}

export function useJejuSearch() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(IDLE);
  const setSearch = useTripUiStore((s) => s.setSearch);
  const requestFit = useTripUiStore((s) => s.requestFit);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setSearch(false);
      return;
    }
    setSearch(true);
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await fetchPage(trimmed, 1, ctrl.signal);
        setState({
          forQuery: trimmed,
          items: data.items,
          total: data.total,
          isEnd: data.isEnd,
          page: 1,
          loading: false,
          error: null,
        });
        setSearch(true, data.items);
        if (data.items.length) requestFit(data.items, 4);
      } catch (error) {
        if (ctrl.signal.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: error instanceof Error ? error.message : "검색에 실패했어요.",
        }));
      }
    }, 260);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [trimmed, setSearch, requestFit]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.isEnd || !state.forQuery) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await fetchPage(state.forQuery, state.page + 1);
      const seen = new Set(state.items.map((p) => p.id));
      const items = [...state.items, ...data.items.filter((p) => !seen.has(p.id))];
      setState((s) => ({ ...s, items, isEnd: data.isEnd, page: s.page + 1, loading: false }));
      setSearch(true, items);
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [state, setSearch]);

  const visible = trimmed ? state : IDLE;
  const stale = Boolean(trimmed) && state.forQuery !== trimmed;

  return {
    query,
    setQuery,
    active: Boolean(trimmed),
    ...visible,
    loading: visible.loading || stale,
    loadMore,
    clear: () => setQuery(""),
  };
}

export function SearchBar({
  query,
  setQuery,
  loading,
  onEnter,
}: {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  onEnter: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onEnter();
      }}
      className="group flex h-16 items-center rounded-full border border-line bg-white pl-7 pr-2 shadow-air transition focus-within:border-transparent focus-within:shadow-air-lg"
    >
      <label className="min-w-0 flex-1 cursor-text">
        <span className="block text-[12px] font-semibold leading-4 text-ink">어디 가볼까요?</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              e.currentTarget.blur();
            }
          }}
          placeholder="제주의 가게, 명소, 카페 검색"
          className="block w-full truncate bg-transparent text-[14px] leading-6 text-ink outline-none placeholder:text-ink-muted"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {query ? (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          className="mr-1 grid size-8 place-items-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      ) : (
        <kbd className="mr-2 hidden h-6 min-w-6 place-items-center rounded-md border border-line px-1.5 text-[12px] font-medium text-ink-soft lg:grid">
          /
        </kbd>
      )}
      <button
        type="submit"
        aria-label="검색"
        className="grid size-12 shrink-0 place-items-center rounded-full bg-rausch text-white transition hover:bg-rausch-active active:scale-95"
      >
        {loading ? (
          <Loader2 size={18} strokeWidth={2.6} className="animate-spin" />
        ) : (
          <Search size={18} strokeWidth={2.8} />
        )}
      </button>
    </form>
  );
}

export function SearchResults({
  search,
}: {
  search: ReturnType<typeof useJejuSearch>;
}) {
  const saved = useTripStore((s) => s.saved);
  const days = useTripStore((s) => s.days);
  const toggleSave = useTripStore((s) => s.toggleSave);
  const select = useTripUiStore((s) => s.select);
  const selected = useTripUiStore((s) => s.selected);
  const hoveredId = useTripUiStore((s) => s.hoveredId);
  const setHovered = useTripUiStore((s) => s.setHovered);
  const showToast = useTripUiStore((s) => s.showToast);
  const setTab = useTripUiStore((s) => s.setTab);

  const { items, loading, error, total, isEnd, query } = search;
  const showSkeleton = loading && items.length === 0;

  return (
    <div className="jeju-fade pb-10">
      <div className="flex items-baseline justify-between px-7 pb-2 pt-6">
        <p className="min-w-0 truncate text-[15px] font-semibold text-ink">
          ‘{query.trim()}’ 검색 결과
        </p>
        {!showSkeleton && !error ? (
          <span className="shrink-0 pl-3 text-[13px] text-ink-muted">
            {total > items.length ? `${total}곳 중 ${items.length}곳` : `${items.length}곳`}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="px-7 py-10 text-center text-[14px] text-ink-muted">{error}</p>
      ) : showSkeleton ? (
        <ul className="px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3.5 px-3 py-3">
              <span className="size-11 animate-pulse rounded-[12px] bg-surface-strong" />
              <span className="flex-1 space-y-2">
                <span className="block h-3.5 w-2/5 animate-pulse rounded bg-surface-strong" />
                <span className="block h-3 w-3/5 animate-pulse rounded bg-surface-soft" />
              </span>
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="px-10 py-14 text-center">
          <p className="text-[16px] font-semibold text-ink">제주에서 찾지 못했어요</p>
          <p className="mt-1.5 text-[14px] text-ink-muted">가게 이름이나 지역명을 함께 넣어보세요.</p>
        </div>
      ) : (
        <ul className="px-4">
          {items.map((place) => {
            const isSaved = Boolean(saved[place.id]);
            const dayIndex = days.findIndex((d) => d.placeIds.includes(place.id));
            const active = selected?.id === place.id || hoveredId === place.id;
            return (
              <li
                key={place.id}
                onMouseEnter={() => setHovered(place.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => select(place)}
                className={cn(
                  "flex cursor-pointer items-center gap-3.5 rounded-2xl px-3 py-3 transition",
                  active ? "bg-surface-soft" : "hover:bg-surface-soft",
                )}
              >
                <PlacePhoto place={place} variant="thumb" className="size-12 shrink-0 rounded-[12px]" iconSize={20} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-5 text-ink">{place.name}</p>
                  <p className="mt-0.5 truncate text-[13px] leading-5 text-ink-muted">
                    {shortCategory(place.categoryName)}
                    <span className="mx-1 text-ink-soft">·</span>
                    {areaOf(place.address)}
                  </p>
                </div>
                {dayIndex >= 0 ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${dayColor(dayIndex)}17`, color: dayColor(dayIndex) }}
                  >
                    {dayIndex + 1}일차
                  </span>
                ) : null}
                <HeartButton
                  saved={isSaved}
                  onToggle={() => {
                    const now = toggleSave(place);
                    showToast(
                      now ? `‘${place.name}’ 담았어요` : `‘${place.name}’ 담기 취소`,
                      now ? { label: "담은 곳 보기", onAction: () => setTab("saved") } : undefined,
                    );
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      {!error && items.length > 0 && !isEnd ? (
        <div className="px-7 pt-3">
          <button
            type="button"
            onClick={search.loadMore}
            disabled={loading}
            className="h-12 w-full rounded-lg border border-ink text-[15px] font-semibold text-ink transition hover:bg-surface-soft disabled:opacity-50"
          >
            {loading ? "불러오는 중…" : "더 보기"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
