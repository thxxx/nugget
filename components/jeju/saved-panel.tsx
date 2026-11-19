"use client";

import { ArrowRight, Ellipsis, ExternalLink, Heart, House, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { PlacePhoto } from "@/components/jeju/place-photo";
import {
  CATEGORY_ICONS,
  MenuDivider,
  MenuItem,
  Popover,
} from "@/components/jeju/primitives";
import { ScheduleButton } from "@/components/jeju/schedule-button";
import {
  areaOf,
  CATEGORY_FILTERS,
  CATEGORY_META,
  shortAddress,
  shortCategory,
} from "@/lib/jeju/category";
import type { PlaceCategory, SavedPlace } from "@/lib/jeju/types";
import { useScrollWhenSelected } from "@/lib/jeju/use-scroll-when-selected";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore } from "@/store/useTripUiStore";

const SUGGESTIONS = ["흑돼지", "고기국수", "해물라면", "오션뷰 카페", "오름", "해변", "감귤 체험"];

export function SavedPanel({ onSuggest }: { onSuggest: (q: string) => void }) {
  const saved = useTripStore((s) => s.saved);
  const savedOrder = useTripStore((s) => s.savedOrder);
  const days = useTripStore((s) => s.days);
  const stayId = useTripStore((s) => s.stayId);
  const setTab = useTripUiStore((s) => s.setTab);
  const [filter, setFilter] = useState<PlaceCategory | "all">("all");

  const list = useMemo(
    () => savedOrder.map((id) => saved[id]).filter(Boolean) as SavedPlace[],
    [saved, savedOrder],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const p of list) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [list]);

  const unscheduledCount = useMemo(() => {
    const ids = new Set(days.flatMap((d) => d.placeIds));
    return list.filter((p) => !ids.has(p.id) && p.id !== stayId).length;
  }, [days, list, stayId]);

  if (list.length === 0) {
    return (
      <div className="jeju-fade flex flex-col items-center px-10 pb-16 pt-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-rausch-soft">
          <Heart size={26} className="fill-rausch text-rausch" />
        </span>
        <p className="mt-6 text-[20px] font-semibold tracking-[-0.18px] text-ink">
          아직 담은 곳이 없어요
        </p>
        <p className="mt-2 text-[14px] leading-[1.6] text-ink-muted">
          가고 싶은 가게나 명소를 검색하고
          <br />
          하트를 눌러 담아두세요.
        </p>
        <div className="mt-8 flex max-w-[320px] flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSuggest(q)}
              className="h-9 rounded-full border border-line px-4 text-[14px] font-medium text-ink transition hover:border-ink"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const stay = stayId ? saved[stayId] : null;
  const activeFilter = filter !== "all" && !counts[filter] ? "all" : filter;
  const filtered = list.filter((p) =>
    activeFilter === "all" ? p.id !== stayId : p.category === activeFilter,
  );

  return (
    <div className="pb-12">
      {stay && activeFilter === "all" ? <StayHero place={stay} /> : null}

      <div className="flex items-center gap-2 overflow-x-auto px-7 pb-2 pt-5 [scrollbar-width:none]">
        {CATEGORY_FILTERS.filter((f) => f === "all" || counts[f]).map((f) => {
          const active = activeFilter === f;
          const Icon = f === "all" ? null : CATEGORY_ICONS[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition",
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-white text-ink hover:border-ink",
              )}
            >
              {Icon ? <Icon size={14} strokeWidth={2.2} /> : null}
              {f === "all" ? "전체" : CATEGORY_META[f].label}
              <span className={cn("font-medium", active ? "text-white/70" : "text-ink-soft")}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between px-7 pb-4 pt-2">
        <p className="text-[13px] text-ink-muted">
          {unscheduledCount === 0
            ? "담은 곳을 모두 일정에 넣었어요"
            : `${unscheduledCount}곳이 아직 일정에 없어요`}
        </p>
        <button
          type="button"
          onClick={() => setTab("trip")}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
        >
          일정 짜기
          <ArrowRight size={14} strokeWidth={2.4} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-7 px-7">
        {filtered.map((place) => (
          <SavedCard key={place.id} place={place} isStay={place.id === stayId} />
        ))}
      </div>
    </div>
  );
}

function useUnsave(place: SavedPlace) {
  const select = useTripUiStore((s) => s.select);
  const showToast = useTripUiStore((s) => s.showToast);
  return () => {
    const snapshot = useTripStore.getState();
    const restore = {
      saved: snapshot.saved,
      savedOrder: snapshot.savedOrder,
      days: snapshot.days,
      stayId: snapshot.stayId,
    };
    snapshot.unsave(place.id);
    if (useTripUiStore.getState().selected?.id === place.id) select(null);
    showToast(`‘${place.name}’ 삭제했어요`, {
      label: "되돌리기",
      onAction: () => useTripStore.setState(restore),
    });
  };
}

function StayHero({ place }: { place: SavedPlace }) {
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);
  const selected = useTripUiStore((s) => s.selected?.id === place.id);

  return (
    <div className="px-7 pt-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => select(place)}
        onKeyDown={(e) => e.key === "Enter" && select(place)}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "group flex cursor-pointer items-center gap-4 rounded-[20px] border p-3 pr-2 transition",
          selected ? "border-ink" : "border-line-soft hover:shadow-air",
        )}
      >
        <PlacePhoto
          place={place}
          sizes="96px"
          className="size-[72px] shrink-0 rounded-[14px]"
          iconSize={24}
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[12px] font-semibold text-ink-muted">
            <House size={12} strokeWidth={2.4} />
            우리 숙소
          </p>
          <p className="mt-0.5 truncate text-[16px] font-semibold leading-6 text-ink">{place.name}</p>
          <p className="truncate text-[13px] text-ink-muted">{shortAddress(place.address)}</p>
        </div>
        <MoreMenu place={place} isStay />
      </div>
    </div>
  );
}

function SavedCard({ place, isStay }: { place: SavedPlace; isStay: boolean }) {
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);
  const selected = useTripUiStore((s) => s.selected?.id === place.id);
  const hovered = useTripUiStore((s) => s.hoveredId === place.id);
  const unsave = useUnsave(place);
  const ref = useScrollWhenSelected<HTMLElement>(selected);

  return (
    <article
      ref={ref}
      onClick={() => select(place)}
      onMouseEnter={() => setHovered(place.id)}
      onMouseLeave={() => setHovered(null)}
      className="group min-w-0 cursor-pointer"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[14px] transition-shadow",
          selected && "shadow-[0_0_0_2px_#fff,0_0_0_4px_#222]",
        )}
      >
        <PlacePhoto
          place={place}
          sizes="(min-width: 1024px) 220px, 46vw"
          controls
          className={cn(
            "aspect-[4/3] w-full transition-transform duration-500 ease-out",
            (hovered || selected) && "scale-[1.04]",
          )}
          iconSize={28}
        />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/20 to-transparent" />

        <button
          type="button"
          aria-label="담은 곳에서 삭제"
          onClick={(e) => {
            e.stopPropagation();
            unsave();
          }}
          className="absolute right-2 top-2 grid size-8 place-items-center rounded-full transition active:scale-90"
        >
          <Heart
            size={22}
            strokeWidth={2}
            className="fill-rausch text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
          />
        </button>

        {isStay ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink shadow-air">
            <House size={11} strokeWidth={2.6} />
            숙소
          </span>
        ) : (
          <div className="absolute bottom-2.5 left-2.5">
            <ScheduleButton place={place} variant="overlay" />
          </div>
        )}
      </div>

      <div className="mt-2.5 flex items-start gap-0.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-5 text-ink">{place.name}</p>
          <p className="truncate text-[13px] leading-5 text-ink-muted">
            {shortCategory(place.categoryName)}
            <span className="mx-1 text-ink-soft">·</span>
            {areaOf(place.address)}
          </p>
          {place.memo ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-ink-body">{place.memo}</p>
          ) : null}
        </div>
        <MoreMenu place={place} isStay={isStay} compact />
      </div>
    </article>
  );
}

function MoreMenu({
  place,
  isStay,
  compact,
}: {
  place: SavedPlace;
  isStay: boolean;
  compact?: boolean;
}) {
  const setStay = useTripStore((s) => s.setStay);
  const showToast = useTripUiStore((s) => s.showToast);
  const unsave = useUnsave(place);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label="더보기"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "grid shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink",
          compact ? "-mr-1.5 -mt-1 size-7" : "size-8",
          open && "bg-surface-strong text-ink",
        )}
      >
        <Ellipsis size={18} />
      </button>
      <Popover open={open} onClose={close} anchorRef={ref} width={220}>
        <MenuItem
          icon={<House size={16} />}
          onClick={() => {
            close();
            setStay(isStay ? null : place.id);
            showToast(isStay ? "숙소 지정을 해제했어요" : `‘${place.name}’을(를) 숙소로 정했어요`);
          }}
        >
          {isStay ? "숙소 지정 해제" : "숙소로 지정"}
        </MenuItem>
        <MenuItem
          icon={<ExternalLink size={16} />}
          disabled={!place.url}
          onClick={() => {
            close();
            window.open(place.url, "_blank", "noopener");
          }}
        >
          카카오맵에서 보기
        </MenuItem>
        <MenuDivider />
        <MenuItem
          danger
          icon={<Trash2 size={16} />}
          onClick={() => {
            close();
            unsave();
          }}
        >
          담은 곳에서 삭제
        </MenuItem>
      </Popover>
    </>
  );
}
