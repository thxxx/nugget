"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Car,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Ellipsis,
  GripVertical,
  House,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PlacePhoto } from "@/components/jeju/place-photo";
import { IconButton, MenuDivider, MenuItem, Popover } from "@/components/jeju/primitives";
import { ScheduleButton } from "@/components/jeju/schedule-button";
import { areaOf, formatStay, shortCategory } from "@/lib/jeju/category";
import { dayDate } from "@/lib/jeju/colors";
import { formatDistance, formatDuration, optimizeOrder } from "@/lib/jeju/geo";
import type { Leg, SavedPlace, TripDay } from "@/lib/jeju/types";
import {
  formatClock,
  kakaoDirectionsUrl,
  type DayRoute,
  type Stop,
} from "@/lib/jeju/use-trip-routes";
import { useScrollWhenSelected } from "@/lib/jeju/use-scroll-when-selected";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore } from "@/store/useTripUiStore";

const POOL = "pool";

function findContainer(days: TripDay[], poolIds: string[], id: string) {
  if (id === POOL || poolIds.includes(id)) return POOL;
  if (days.some((d) => d.id === id)) return id;
  return days.find((d) => d.placeIds.includes(id))?.id ?? null;
}

function usePoolIds() {
  const saved = useTripStore((s) => s.saved);
  const savedOrder = useTripStore((s) => s.savedOrder);
  const days = useTripStore((s) => s.days);
  const stayId = useTripStore((s) => s.stayId);
  return useMemo(() => {
    const scheduled = new Set(days.flatMap((d) => d.placeIds));
    return savedOrder.filter((id) => saved[id] && !scheduled.has(id) && id !== stayId);
  }, [saved, savedOrder, days, stayId]);
}

export function ItineraryPanel({ routes }: { routes: DayRoute[] }) {
  const saved = useTripStore((s) => s.saved);
  const setDays = useTripStore((s) => s.setDays);
  const setDayPlaces = useTripStore((s) => s.setDayPlaces);
  const addDay = useTripStore((s) => s.addDay);
  const poolIds = usePoolIds();

  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshot = useRef<TripDay[] | null>(null);
  const poolRef = useRef(poolIds);
  useEffect(() => {
    poolRef.current = poolIds;
  }, [poolIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    snapshot.current = useTripStore.getState().days;
    setActiveId(String(active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const days = useTripStore.getState().days;
    const aId = String(active.id);
    const oId = String(over.id);
    const from = findContainer(days, poolRef.current, aId);
    const to = findContainer(days, poolRef.current, oId);
    if (!from || !to || from === to) return;

    if (to === POOL) {
      setDays(days.map((d) => ({ ...d, placeIds: d.placeIds.filter((x) => x !== aId) })));
      return;
    }

    const target = days.find((d) => d.id === to)!;
    let index = target.placeIds.length;
    if (oId !== to) {
      const overIndex = target.placeIds.indexOf(oId);
      const translated = active.rect.current.translated;
      const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
      index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.placeIds.length;
    }

    setDays(
      days.map((d) => {
        const without = d.placeIds.filter((x) => x !== aId);
        if (d.id !== to) return without.length === d.placeIds.length ? d : { ...d, placeIds: without };
        without.splice(index, 0, aId);
        return { ...d, placeIds: without };
      }),
    );
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    snapshot.current = null;
    if (!over) return;
    const days = useTripStore.getState().days;
    const aId = String(active.id);
    const oId = String(over.id);
    const container = findContainer(days, poolRef.current, aId);
    if (!container || container === POOL || container !== findContainer(days, poolRef.current, oId)) return;
    const day = days.find((d) => d.id === container)!;
    const oldIndex = day.placeIds.indexOf(aId);
    const newIndex = oId === container ? day.placeIds.length - 1 : day.placeIds.indexOf(oId);
    if (oldIndex !== newIndex && newIndex >= 0) {
      setDayPlaces(container, arrayMove(day.placeIds, oldIndex, newIndex));
    }
  };

  const onDragCancel = () => {
    if (snapshot.current) setDays(snapshot.current);
    snapshot.current = null;
    setActiveId(null);
  };

  const activePlace = activeId ? saved[activeId] : null;
  const activeRoute = activeId ? routes.find((r) => r.day.placeIds.includes(activeId)) : null;

  return (
    <div className="pb-12">
      <TripHeader routes={routes} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        {routes.map((route) => (
          <DaySection key={route.day.id} route={route} dragging={Boolean(activeId)} />
        ))}

        <div className="px-7 pb-2 pt-3">
          <button
            type="button"
            onClick={() => addDay()}
            className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-[14px] font-semibold text-ink-muted transition hover:border-ink hover:text-ink"
          >
            <Plus size={16} strokeWidth={2.4} />
            {routes.length + 1}일차 추가
          </button>
        </div>

        <PoolSection ids={poolIds} dragging={Boolean(activeId)} />

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
          {activePlace ? (
            <div className="rounded-2xl bg-white shadow-air-lg">
              <StopRow
                place={activePlace}
                color={activeRoute?.color ?? "#222222"}
                number={activeRoute ? activeRoute.day.placeIds.indexOf(activePlace.id) + 1 : null}
                overlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

/* ---------------------------------------------------------------- header */

function TripHeader({ routes }: { routes: DayRoute[] }) {
  const saved = useTripStore((s) => s.saved);
  const stayId = useTripStore((s) => s.stayId);
  const startDate = useTripStore((s) => s.startDate);
  const setStartDate = useTripStore((s) => s.setStartDate);
  const showToast = useTripUiStore((s) => s.showToast);
  const select = useTripUiStore((s) => s.select);
  const setTab = useTripUiStore((s) => s.setTab);
  const dateRef = useRef<HTMLInputElement>(null);

  const stay = stayId ? saved[stayId] : null;
  const placeCount = routes.reduce((n, r) => n + r.day.placeIds.length, 0);
  const totalDuration = routes.reduce((n, r) => n + r.totalDuration, 0);
  const totalDistance = routes.reduce((n, r) => n + r.totalDistance, 0);

  const first = dayDate(startDate, 0);
  const last = dayDate(startDate, routes.length - 1);

  const copy = async () => {
    const text = buildShareText(routes, startDate);
    try {
      await navigator.clipboard.writeText(text);
      showToast("일정을 텍스트로 복사했어요");
    } catch {
      showToast("복사하지 못했어요");
    }
  };

  return (
    <div className="px-7 pb-4 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-7 tracking-[-0.44px] text-ink">제주 여행</h2>
          <p className="mt-1 text-[14px] leading-5 text-ink-muted">
            {first && last
              ? routes.length > 1
                ? `${first.short} – ${last.short}`
                : first.short
              : `${routes.length}일`}
            <span className="mx-1.5 text-ink-soft">·</span>
            {placeCount}곳
            {totalDuration > 0 ? (
              <>
                <span className="mx-1.5 text-ink-soft">·</span>
                이동 {formatDuration(totalDuration)} · {formatDistance(totalDistance)}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const el = dateRef.current;
                if (!el) return;
                try {
                  el.showPicker();
                } catch {
                  el.focus();
                }
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink"
            >
              <CalendarDays size={15} />
              {first ? `${first.short} 출발` : "날짜 선택"}
            </button>
            <input
              ref={dateRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              value={startDate ?? ""}
              onChange={(e) => setStartDate(e.target.value || null)}
              className="pointer-events-none absolute inset-0 opacity-0"
            />
          </div>
          <IconButton label="일정 텍스트로 복사" onClick={copy} className="size-9">
            <Copy size={16} />
          </IconButton>
        </div>
      </div>

      {stay ? (
        <button
          type="button"
          onClick={() => select(stay)}
          className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-line-soft p-2.5 pr-4 text-left transition hover:shadow-air"
        >
          <PlacePhoto place={stay} variant="thumb" className="size-11 shrink-0 rounded-[10px]" iconSize={18} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-muted">
              <House size={11} strokeWidth={2.6} />
              숙소 · 매일 출발하고 돌아와요
            </span>
            <span className="block truncate text-[15px] font-semibold text-ink">{stay.name}</span>
          </span>
          <span className="shrink-0 text-[12px] text-ink-muted">{areaOf(stay.address)}</span>
        </button>
      ) : (
        <div className="mt-5 rounded-2xl bg-surface-soft px-4 py-3.5 text-[13px] leading-[1.55] text-ink-body">
          <span className="font-semibold text-ink">숙소를 정하면</span> 매일 숙소에서 출발하고
          돌아오는 이동시간까지 계산해요.{" "}
          <button
            type="button"
            onClick={() => setTab("saved")}
            className="font-semibold text-ink underline underline-offset-2"
          >
            담은 곳
          </button>
          의 ⋯ 메뉴에서 ‘숙소로 지정’을 눌러보세요.
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- day */

const START_TIMES = Array.from({ length: 15 }, (_, i) => formatClock(7 * 60 + i * 30));

function DaySection({ route, dragging }: { route: DayRoute; dragging: boolean }) {
  const { day, index, color, stops, legs } = route;
  const startDate = useTripStore((s) => s.startDate);
  const stayId = useTripStore((s) => s.stayId);
  const saved = useTripStore((s) => s.saved);
  const toggleDayStay = useTripStore((s) => s.toggleDayStay);
  const setDayPlaces = useTripStore((s) => s.setDayPlaces);
  const setDayStartTime = useTripStore((s) => s.setDayStartTime);
  const removeDay = useTripStore((s) => s.removeDay);
  const focusDayId = useTripUiStore((s) => s.focusDayId);
  const setFocusDay = useTripUiStore((s) => s.setFocusDay);
  const setHoverDay = useTripUiStore((s) => s.setHoverDay);
  const requestFit = useTripUiStore((s) => s.requestFit);
  const showToast = useTripUiStore((s) => s.showToast);

  const { setNodeRef, isOver } = useDroppable({ id: day.id });
  const sectionRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [timeOpen, setTimeOpen] = useState(false);
  const timeRef = useRef<HTMLButtonElement>(null);
  const closeTime = useCallback(() => setTimeOpen(false), []);

  const date = dayDate(startDate, index);
  const focused = focusDayId === day.id;
  const stay = stayId ? saved[stayId] : null;
  const placeCount = day.placeIds.length;

  useEffect(() => {
    if (focused) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focused]);

  const toggleFocus = () => {
    if (focused) {
      setFocusDay(null);
      return;
    }
    setFocusDay(day.id);
    if (stops.length) requestFit(stops.map((s) => s.place), 3);
  };

  const optimize = () => {
    const places = day.placeIds.map((id) => saved[id]).filter(Boolean) as SavedPlace[];
    const start = stay && day.startFromStay ? stay : null;
    const end = stay && day.endAtStay ? stay : null;
    const ordered = optimizeOrder(places, start, end).map((p) => p.id);
    if (ordered.join() === day.placeIds.join()) {
      showToast("이미 가장 효율적인 동선이에요");
      return;
    }
    const before = day.placeIds;
    setDayPlaces(day.id, ordered);
    showToast(`${index + 1}일차 동선을 정리했어요`, {
      label: "되돌리기",
      onAction: () => setDayPlaces(day.id, before),
    });
  };

  const remove = () => {
    const before = useTripStore.getState().days;
    removeDay(day.id);
    if (focused) setFocusDay(null);
    showToast(`${index + 1}일차를 삭제했어요`, {
      label: "되돌리기",
      onAction: () => useTripStore.setState({ days: before }),
    });
  };

  const placeStops = stops.map((stop, i) => ({ stop, i })).filter(({ stop }) => stop.kind === "place");
  const lastStop = stops[stops.length - 1];

  return (
    <section ref={sectionRef} className="scroll-mt-4 border-t border-line-soft px-4 pb-4 pt-5">
      <header
        className="flex items-start gap-2 px-3"
        onMouseEnter={() => setHoverDay(day.id)}
        onMouseLeave={() => setHoverDay(null)}
      >
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleFocus}
            title={focused ? "전체 지도 보기" : "지도에서 이 날만 보기"}
            className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1 text-left transition hover:bg-surface-soft"
          >
            <span
              className={cn("size-3 shrink-0 rounded-full transition", focused && "ring-4")}
              style={{ background: color, ["--tw-ring-color" as string]: `${color}33` }}
            />
            <span className="text-[18px] font-semibold tracking-[-0.18px] text-ink">{index + 1}일차</span>
            {date ? <span className="text-[14px] text-ink-muted">{date.short}</span> : null}
          </button>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 pl-[22px] text-[13px] text-ink-muted">
            <button
              ref={timeRef}
              type="button"
              onClick={() => setTimeOpen((v) => !v)}
              className={cn(
                "-mx-1 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium text-ink transition hover:bg-surface-strong",
                timeOpen && "bg-surface-strong",
              )}
            >
              <Clock size={13} strokeWidth={2.2} />
              <span className="tabular-nums">{day.startTime}</span> 출발
              <ChevronDown size={13} />
            </button>
            {placeCount > 0 ? (
              <>
                <span className="text-ink-soft">·</span>
                <span>{placeCount}곳</span>
                {route.totalDuration > 0 ? (
                  <>
                    <span className="text-ink-soft">·</span>
                    <span>
                      이동 {route.hasEstimate ? "약 " : ""}
                      {formatDuration(route.totalDuration)}
                    </span>
                  </>
                ) : null}
                {route.endTime !== null && !route.pending ? (
                  <>
                    <span className="text-ink-soft">·</span>
                    <span className="tabular-nums">{formatClock(route.endTime)} 마무리</span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <Popover open={timeOpen} onClose={closeTime} anchorRef={timeRef} width={168} align="start">
            <div className="jeju-scroll max-h-[260px] overflow-y-auto">
              {START_TIMES.map((t) => (
                <MenuItem
                  key={t}
                  trailing={t === day.startTime ? <Check size={15} /> : null}
                  onClick={() => {
                    setDayStartTime(day.id, t);
                    closeTime();
                  }}
                >
                  <span className="tabular-nums">{t}</span> 출발
                </MenuItem>
              ))}
            </div>
          </Popover>
        </div>
        <button
          ref={menuRef}
          type="button"
          aria-label={`${index + 1}일차 메뉴`}
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink",
            menuOpen && "bg-surface-strong text-ink",
          )}
        >
          <Ellipsis size={18} />
        </button>
        <Popover open={menuOpen} onClose={closeMenu} anchorRef={menuRef} width={232}>
          <MenuItem
            icon={<Sparkles size={16} />}
            disabled={placeCount < 2}
            onClick={() => {
              closeMenu();
              optimize();
            }}
          >
            동선 자동 정리
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={<House size={16} />}
            disabled={!stay}
            trailing={day.startFromStay && stay ? <Check size={16} /> : null}
            onClick={() => toggleDayStay(day.id, "start")}
          >
            숙소에서 출발
          </MenuItem>
          <MenuItem
            icon={<House size={16} />}
            disabled={!stay}
            trailing={day.endAtStay && stay ? <Check size={16} /> : null}
            onClick={() => toggleDayStay(day.id, "end")}
          >
            숙소로 돌아오기
          </MenuItem>
          <MenuDivider />
          <MenuItem
            danger
            icon={<Trash2 size={16} />}
            onClick={() => {
              closeMenu();
              remove();
            }}
          >
            {index + 1}일차 삭제
          </MenuItem>
        </Popover>
      </header>

      <SortableContext id={day.id} items={day.placeIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn("mt-3 rounded-2xl transition-colors", isOver && placeCount === 0 && "bg-surface-soft")}
        >
          {stops[0]?.kind === "stay-start" ? (
            <StayRow stop={stops[0]} label="출발" onRemove={() => toggleDayStay(day.id, "start")} />
          ) : null}

          {placeStops.map(({ stop, i }) => (
            <SortableStop
              key={stop.place.id}
              stop={stop}
              color={color}
              leg={i > 0 ? legs[i - 1] : null}
              from={i > 0 ? stops[i - 1].place : null}
              dragging={dragging}
            />
          ))}

          {lastStop && lastStop.kind === "stay-end" ? (
            <>
              <Connector
                color={color}
                leg={legs[stops.length - 2]}
                from={stops[stops.length - 2].place}
                to={lastStop.place}
                dragging={dragging}
              />
              <StayRow stop={lastStop} label="도착" onRemove={() => toggleDayStay(day.id, "end")} />
            </>
          ) : null}

          {placeCount === 0 ? (
            <div
              className={cn(
                "mx-3 my-1 rounded-2xl border border-dashed px-5 py-6 text-center transition-colors",
                isOver ? "border-ink bg-surface-soft" : "border-line",
              )}
            >
              <p className="text-[14px] font-medium text-ink">아직 이 날은 비어 있어요</p>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                아래 ‘아직 안 정한 곳’에서 끌어다 놓거나
                <br />
                ‘+ 일정’을 눌러 추가하세요.
              </p>
            </div>
          ) : null}
        </div>
      </SortableContext>
    </section>
  );
}

/* ---------------------------------------------------------------- pool */

function PoolSection({ ids, dragging }: { ids: string[]; dragging: boolean }) {
  const saved = useTripStore((s) => s.saved);
  const { setNodeRef, isOver } = useDroppable({ id: POOL });

  return (
    <section className="mt-4 border-t border-line-soft px-4 pt-6">
      <header className="flex items-baseline justify-between px-3">
        <h3 className="text-[16px] font-semibold text-ink">
          아직 안 정한 곳 <span className="ml-0.5 text-ink-soft">{ids.length}</span>
        </h3>
        <p className="text-[12px] text-ink-muted">끌어서 원하는 날에 놓으세요</p>
      </header>
      <SortableContext id={POOL} items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "mt-2 min-h-16 rounded-2xl transition-colors",
            dragging && "outline-1 outline-dashed outline-line",
            isOver && "bg-surface-soft",
          )}
        >
          {ids.length === 0 ? (
            <p className="px-3 py-5 text-center text-[13px] text-ink-muted">
              담은 곳을 모두 일정에 넣었어요. 여기로 끌어오면 일정에서 빠져요.
            </p>
          ) : (
            ids.map((id) => (saved[id] ? <SortablePoolItem key={id} place={saved[id]} /> : null))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortablePoolItem({ place }: { place: SavedPlace }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: place.id });
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);
  const active = useTripUiStore((s) => s.selected?.id === place.id || s.hoveredId === place.id);
  const rowRef = useScrollWhenSelected<HTMLDivElement>(
    useTripUiStore((s) => s.selected?.id === place.id),
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-30")}
    >
      <div
        ref={rowRef}
        onClick={() => select(place)}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors",
          active ? "bg-surface-soft" : "hover:bg-surface-soft",
        )}
      >
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label="끌어서 일정에 넣기"
          className="-ml-1 grid size-6 shrink-0 cursor-grab touch-none place-items-center rounded-full text-ink-soft transition hover:text-ink"
        >
          <GripVertical size={16} />
        </span>
        <PlacePhoto place={place} variant="thumb" className="size-11 shrink-0 rounded-[10px]" iconSize={18} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-5 text-ink">{place.name}</p>
          <p className="truncate text-[12px] leading-[18px] text-ink-muted">
            {shortCategory(place.categoryName)}
            <span className="mx-1 text-ink-soft">·</span>
            {areaOf(place.address)}
          </p>
        </div>
        <ScheduleButton place={place} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- rows */

function SortableStop({
  stop,
  color,
  leg,
  from,
  dragging,
}: {
  stop: Stop;
  color: string;
  leg: Leg | null;
  from: SavedPlace | null;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: stop.place.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-30")}
    >
      {leg && from ? (
        <Connector color={color} leg={leg} from={from} to={stop.place} dragging={dragging} />
      ) : null}
      <StopRow
        place={stop.place}
        color={color}
        number={stop.number}
        arrive={stop.arrive}
        stayMinutes={stop.stayMinutes}
        handleProps={{ ...attributes, ...listeners }}
        handleRef={setActivatorNodeRef}
      />
    </div>
  );
}

function StopRow({
  place,
  color,
  number,
  arrive,
  stayMinutes,
  overlay,
  handleProps,
  handleRef,
}: {
  place: SavedPlace;
  color: string;
  number: number | null;
  arrive?: number | null;
  stayMinutes?: number;
  overlay?: boolean;
  handleProps?: Record<string, unknown>;
  handleRef?: (el: HTMLElement | null) => void;
}) {
  const select = useTripUiStore((s) => s.select);
  const active = useTripUiStore(
    (s) => !overlay && (s.selected?.id === place.id || s.hoveredId === place.id),
  );
  const setHovered = useTripUiStore((s) => s.setHovered);
  const removeFromDays = useTripStore((s) => s.removeFromDays);
  const showToast = useTripUiStore((s) => s.showToast);
  const rowRef = useScrollWhenSelected<HTMLDivElement>(
    useTripUiStore((s) => !overlay && s.selected?.id === place.id),
  );

  return (
    <div
      ref={rowRef}
      onMouseEnter={() => !overlay && setHovered(place.id)}
      onMouseLeave={() => !overlay && setHovered(null)}
      onClick={() => select(place)}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors",
        overlay ? "cursor-grabbing" : active ? "bg-surface-soft" : "hover:bg-surface-soft",
      )}
    >
      <span
        className="grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white shadow-[0_0_0_2px_#fff]"
        style={{ background: color }}
      >
        {number ?? "·"}
      </span>
      <PlacePhoto place={place} variant="thumb" className="size-11 shrink-0 rounded-[10px]" iconSize={18} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-5 text-ink">{place.name}</p>
        <p className="truncate text-[12px] leading-[18px] text-ink-muted">
          {shortCategory(place.categoryName)}
          <span className="mx-1 text-ink-soft">·</span>
          {areaOf(place.address)}
          {place.memo ? (
            <>
              <span className="mx-1 text-ink-soft">·</span>
              <span className="text-ink-body">{place.memo}</span>
            </>
          ) : null}
        </p>
      </div>
      {!overlay ? (
        <>
          <div className="shrink-0 text-right group-hover:hidden">
            {arrive !== null && arrive !== undefined ? (
              <>
                <p className="text-[13px] font-semibold tabular-nums leading-5 text-ink">
                  {formatClock(arrive)}
                </p>
                {stayMinutes ? (
                  <p className="text-[11px] leading-4 text-ink-soft">{formatStay(stayMinutes)}</p>
                ) : null}
              </>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="일정에서 빼기"
            title="일정에서 빼기"
            onClick={(e) => {
              e.stopPropagation();
              removeFromDays(place.id);
              showToast(`일정에서 ‘${place.name}’ 뺐어요`);
            }}
            className="hidden size-7 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-strong hover:text-ink group-hover:grid"
          >
            <X size={15} strokeWidth={2.4} />
          </button>
        </>
      ) : null}
      <span
        ref={handleRef}
        {...handleProps}
        onClick={(e) => e.stopPropagation()}
        aria-label="끌어서 순서 바꾸기"
        className={cn(
          "-mr-1 grid size-7 shrink-0 touch-none place-items-center rounded-full text-ink-soft transition hover:bg-surface-strong hover:text-ink",
          overlay ? "cursor-grabbing text-ink" : "cursor-grab",
        )}
      >
        <GripVertical size={16} />
      </span>
    </div>
  );
}

function StayRow({ stop, label, onRemove }: { stop: Stop; label: string; onRemove: () => void }) {
  const select = useTripUiStore((s) => s.select);
  const time = stop.kind === "stay-start" ? stop.depart : stop.arrive;
  return (
    <div
      onClick={() => select(stop.place)}
      className="group flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-surface-soft"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-white shadow-[0_0_0_2px_#fff]">
        <House size={13} strokeWidth={2.4} />
      </span>
      <p className="min-w-0 flex-1 truncate text-[14px] text-ink-body">
        <span className="font-semibold text-ink">{stop.place.name}</span>
        <span className="ml-1.5 text-ink-muted">{label}</span>
      </p>
      {time !== null ? (
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink group-hover:hidden">
          {formatClock(time)}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={`숙소 ${label} 빼기`}
        title={`숙소 ${label} 빼기`}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hidden size-7 shrink-0 place-items-center rounded-full text-ink-soft transition hover:bg-surface-strong hover:text-ink group-hover:grid"
      >
        <X size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
}

function Connector({
  color,
  leg,
  from,
  to,
  dragging,
}: {
  color: string;
  leg: Leg | undefined;
  from: SavedPlace;
  to: SavedPlace;
  dragging: boolean;
}) {
  return (
    <div className="flex h-8 items-center pl-[25px]">
      <span
        className="h-full w-0 border-l-2 border-dotted"
        style={{ borderColor: `${color}80` }}
        aria-hidden
      />
      {!dragging && leg ? (
        leg.status === "loading" ? (
          <span className="ml-[24px] inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-soft px-2.5 text-[12px] text-ink-soft">
            <Car size={13} className="animate-pulse" />
            경로 계산 중
          </span>
        ) : (
          <a
            href={kakaoDirectionsUrl(from, to)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={
              leg.status === "estimate"
                ? "도로 경로를 찾지 못해 직선거리로 추정했어요 · 카카오맵 길찾기 열기"
                : `카카오맵 길찾기 열기${leg.taxi ? ` · 택시 약 ${leg.taxi.toLocaleString()}원` : ""}`
            }
            className="ml-[24px] inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-soft px-2.5 text-[12px] font-medium text-ink-muted transition hover:bg-surface-strong hover:text-ink"
          >
            <Car size={13} />
            {leg.status === "estimate" ? "약 " : ""}
            {formatDuration(leg.duration)}
            <span className="text-ink-soft">·</span>
            {formatDistance(leg.distance)}
          </a>
        )
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- share */

function buildShareText(routes: DayRoute[], startDate: string | null) {
  const lines: string[] = [];
  const first = dayDate(startDate, 0);
  const last = dayDate(startDate, routes.length - 1);
  lines.push(`제주 여행${first && last ? ` · ${first.long} – ${last.long}` : ""}`);

  for (const route of routes) {
    const date = dayDate(startDate, route.index);
    lines.push("", `■ ${route.index + 1}일차${date ? ` · ${date.long}` : ""}`);
    if (route.stops.length === 0) {
      lines.push("  (비어 있음)");
      continue;
    }
    route.stops.forEach((stop, i) => {
      if (i > 0) {
        const leg = route.legs[i - 1];
        if (leg && leg.status !== "loading") {
          lines.push(`   ↓ 차로 ${formatDuration(leg.duration)} (${formatDistance(leg.distance)})`);
        }
      }
      const time = stop.kind === "stay-start" ? stop.depart : stop.arrive;
      const clock = time !== null ? `${formatClock(time)} ` : "";
      const name =
        stop.kind === "place"
          ? `${clock}${stop.number}. ${stop.place.name}`
          : `${clock}🏠 ${stop.place.name} ${stop.kind === "stay-start" ? "출발" : "도착"}`;
      lines.push(`  ${name}${stop.place.memo ? ` — ${stop.place.memo}` : ""}`);
    });
  }

  return lines.join("\n");
}
