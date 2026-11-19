"use client";

import {
  Car,
  ExternalLink,
  Heart,
  House,
  Maximize2,
  MapPin,
  Minus,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { MapContext, MapOverlay, RouteLine, useMapCtx } from "@/components/jeju/map-primitives";
import { PlacePhoto } from "@/components/jeju/place-photo";
import { CATEGORY_ICONS } from "@/components/jeju/primitives";
import { ScheduleButton } from "@/components/jeju/schedule-button";
import {
  CATEGORY_META,
  DEFAULT_STAY_MINUTES,
  formatStay,
  shortAddress,
  shortCategory,
  STAY_OPTIONS,
} from "@/lib/jeju/category";
import { formatDuration, JEJU_CENTER, pathMidpoint } from "@/lib/jeju/geo";
import { loadKakaoMaps, type KMap, type KMaps } from "@/lib/jeju/kakao";
import type { Place } from "@/lib/jeju/types";
import { formatClock, stayMinutesOf, type DayRoute } from "@/lib/jeju/use-trip-routes";
import { cn } from "@/lib/utils";
import { usePlacePhotos } from "@/store/usePhotoStore";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore } from "@/store/useTripUiStore";

/** Kakao map levels: smaller = closer. Labels for numbered stops show at or below this level. */
const LABEL_LEVEL = 8;

export function TripMap({ routes }: { routes: DayRoute[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<{ map: KMap; maps: KMaps } | null>(null);
  const [level, setLevel] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((maps) => {
        const el = containerRef.current;
        if (cancelled || !el) return;
        const map = new maps.Map(el, {
          center: new maps.LatLng(JEJU_CENTER.lat, JEJU_CENTER.lng),
          level: 10,
        });
        map.setMaxLevel(12);
        maps.event.addListener(map, "zoom_changed", () => setLevel(map.getLevel()));
        maps.event.addListener(map, "click", () => useTripUiStore.getState().select(null));
        setLevel(map.getLevel());
        setInstance({ map, maps });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "지도를 불러오지 못했어요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !instance) return;
    const ro = new ResizeObserver(() => instance.map.relayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [instance]);

  const ctx = useMemo(() => (instance ? { ...instance, level } : null), [instance, level]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#eef1f0]">
      <div ref={containerRef} className="jeju-map absolute inset-0" />

      {!instance && !error ? (
        <div className="absolute inset-0 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-ink-muted shadow-air">
            <span className="size-2 animate-ping rounded-full bg-rausch" />
            지도를 불러오는 중
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 grid place-items-center p-8">
          <div className="max-w-sm rounded-2xl bg-white p-6 text-center shadow-air">
            <p className="text-[16px] font-semibold text-ink">카카오 지도를 불러오지 못했어요</p>
            <p className="mt-2 text-[13px] leading-5 text-ink-muted">
              {error}
              <br />
              카카오 개발자 콘솔에 현재 도메인이 등록돼 있는지 확인해 주세요.
            </p>
          </div>
        </div>
      ) : null}

      {ctx ? (
        <MapContext.Provider value={ctx}>
          <MapController routes={routes} />
          <MapLayers routes={routes} />
          <DayLegend routes={routes} />
          <MapControls routes={routes} />
        </MapContext.Provider>
      ) : null}

      <PlaceDetailCard routes={routes} />
    </div>
  );
}

/* ------------------------------------------------------------ camera */

function useAllPoints(routes: DayRoute[]) {
  const saved = useTripStore((s) => s.saved);
  return useMemo(() => {
    const pts = Object.values(saved).map((p) => ({ lat: p.lat, lng: p.lng }));
    for (const r of routes) for (const s of r.stops) pts.push({ lat: s.place.lat, lng: s.place.lng });
    return pts;
  }, [saved, routes]);
}

function MapController({ routes }: { routes: DayRoute[] }) {
  const { map, maps } = useMapCtx();
  const fitRequest = useTripUiStore((s) => s.fitRequest);
  const panRequest = useTripUiStore((s) => s.panRequest);
  const requestFit = useTripUiStore((s) => s.requestFit);
  const allPoints = useAllPoints(routes);
  const didInitialFit = useRef(false);

  // Fit to the trip once on load.
  useEffect(() => {
    if (didInitialFit.current) return;
    didInitialFit.current = true;
    if (allPoints.length) requestFit(allPoints, 5);
  }, [allPoints, requestFit]);

  useEffect(() => {
    if (!fitRequest || fitRequest.points.length === 0) return;
    const pts = fitRequest.points;
    if (pts.length === 1) {
      const ll = new maps.LatLng(pts[0].lat, pts[0].lng);
      if (map.getLevel() > 6) map.setLevel(6);
      map.panTo(ll);
      return;
    }
    const bounds = new maps.LatLngBounds();
    pts.forEach((p) => bounds.extend(new maps.LatLng(p.lat, p.lng)));
    const pad = window.innerWidth < 1024 ? 44 : 110;
    map.setBounds(bounds, pad, pad, pad, Math.round(pad * 0.85));
    if (fitRequest.minLevel && map.getLevel() < fitRequest.minLevel) map.setLevel(fitRequest.minLevel);
  }, [fitRequest, map, maps]);

  useEffect(() => {
    if (!panRequest) return;
    const ll = new maps.LatLng(panRequest.lat, panRequest.lng);
    if (map.getLevel() > 7) map.setLevel(7, { anchor: ll });
    // On desktop the detail card covers the map's left side: center the pin in the free area.
    if (window.innerWidth >= 1024) {
      const projection = map.getProjection();
      const p = projection.pointFromCoords(ll);
      map.panTo(projection.coordsFromPoint(new maps.Point(p.x - 200, p.y + 40)));
    } else {
      map.panTo(ll);
    }
  }, [panRequest, map, maps]);

  return null;
}

/* ------------------------------------------------------------ layers */

function MapLayers({ routes }: { routes: DayRoute[] }) {
  const saved = useTripStore((s) => s.saved);
  const savedOrder = useTripStore((s) => s.savedOrder);
  const stayId = useTripStore((s) => s.stayId);
  const searchOpen = useTripUiStore((s) => s.searchOpen);
  const searchResults = useTripUiStore((s) => s.searchResults);
  const selected = useTripUiStore((s) => s.selected);
  const focusDayId = useTripUiStore((s) => s.focusDayId ?? s.hoverDayId);

  const scheduled = useMemo(() => new Set(routes.flatMap((r) => r.day.placeIds)), [routes]);
  const focusRoute = focusDayId ? routes.find((r) => r.day.id === focusDayId) : null;
  const searchIds = useMemo(
    () => new Set(searchOpen ? searchResults.map((p) => p.id) : []),
    [searchOpen, searchResults],
  );

  const stay = stayId ? saved[stayId] : null;
  const selectedIsOrphan =
    selected && !saved[selected.id] && !searchIds.has(selected.id) ? selected : null;

  return (
    <>
      {routes.map((route) =>
        route.legs.map((leg, i) =>
          leg.status === "loading" || leg.path.length < 2 ? null : (
            <RouteLine
              key={`${route.day.id}:${i}:${route.stops[i].place.id}>${route.stops[i + 1].place.id}`}
              path={leg.path}
              color={route.color}
              dashed={leg.status === "estimate"}
              dimmed={Boolean(focusDayId && focusDayId !== route.day.id)}
            />
          ),
        ),
      )}

      {savedOrder
        .filter((id) => !scheduled.has(id) && id !== stayId && !searchIds.has(id) && saved[id])
        .map((id) => (
          <SavedPin key={`saved-${id}`} place={saved[id]} dimmed={Boolean(focusDayId)} />
        ))}

      {routes.flatMap((route) =>
        route.stops
          .filter((s) => s.kind === "place" && s.place.id !== stayId && !searchIds.has(s.place.id))
          .map((s) => (
            <StopPin
              key={`stop-${s.place.id}`}
              place={s.place}
              number={s.number ?? 0}
              color={route.color}
              dimmed={Boolean(focusDayId && focusDayId !== route.day.id)}
              focused={focusDayId === route.day.id}
            />
          )),
      )}

      {stay && !searchIds.has(stay.id) ? <StayPin key={`stay-${stay.id}`} place={stay} /> : null}

      {searchOpen
        ? searchResults.map((p) => <SearchPin key={`search-${p.id}`} place={p} />)
        : null}

      {selectedIsOrphan ? <SearchPin key={`orphan-${selectedIsOrphan.id}`} place={selectedIsOrphan} /> : null}

      {focusRoute
        ? focusRoute.legs.map((leg, i) => {
            if (leg.status === "loading" || leg.duration === 0) return null;
            const mid = pathMidpoint(leg.path);
            if (!mid) return null;
            return (
              <MapOverlay
                key={`bubble-${focusRoute.day.id}-${i}-${focusRoute.stops[i + 1].place.id}`}
                lat={mid.lat}
                lng={mid.lng}
                zIndex={15}
              >
                <span
                  className="jeju-root jeju-pop pointer-events-none inline-flex items-center gap-1 whitespace-nowrap rounded-full border-2 bg-white px-2 py-0.5 text-[11px] font-bold text-ink shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
                  style={{ borderColor: focusRoute.color }}
                >
                  <Car size={11} strokeWidth={2.6} style={{ color: focusRoute.color }} />
                  {leg.status === "estimate" ? "약 " : ""}
                  {formatDuration(leg.duration)}
                </span>
              </MapOverlay>
            );
          })
        : null}
    </>
  );
}

function usePinState(id: string) {
  const selected = useTripUiStore((s) => s.selected?.id === id);
  const hovered = useTripUiStore((s) => s.hoveredId === id);
  return { selected, hovered, active: selected || hovered };
}

function PinLabel({ name, sub, show }: { name: string; sub?: string; show: boolean }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-full top-1/2 ml-1.5 -translate-y-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink shadow-air transition-all duration-150",
        show ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0",
      )}
    >
      {sub ? <span className="mr-1 font-medium text-ink-muted">{sub}</span> : null}
      {name}
    </span>
  );
}

function StopPin({
  place,
  number,
  color,
  dimmed,
  focused,
}: {
  place: Place;
  number: number;
  color: string;
  dimmed: boolean;
  focused: boolean;
}) {
  const { level } = useMapCtx();
  const { selected, active } = usePinState(place.id);
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);

  const showLabel = active || (!dimmed && (level <= LABEL_LEVEL || focused));

  return (
    <MapOverlay lat={place.lat} lng={place.lng} zIndex={active ? 100 : dimmed ? 5 : 20}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select(place, { pan: false });
        }}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "jeju-root jeju-pop relative grid size-[30px] place-items-center rounded-full text-[13px] font-bold text-white shadow-[0_0_0_2.5px_#fff,0_2px_8px_rgba(0,0,0,0.25)] transition duration-150",
          active && "scale-[1.18]",
          dimmed && !active && "opacity-35",
          selected && "shadow-[0_0_0_2.5px_#fff,0_0_0_6px_rgba(34,34,34,0.18),0_2px_8px_rgba(0,0,0,0.25)]",
        )}
        style={{ background: color }}
      >
        {number}
        <PinLabel name={place.name} show={showLabel} />
      </button>
    </MapOverlay>
  );
}

function SavedPin({ place, dimmed }: { place: Place; dimmed: boolean }) {
  const { level } = useMapCtx();
  const { selected, active } = usePinState(place.id);
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);
  const Icon = CATEGORY_ICONS[place.category];
  const color = CATEGORY_META[place.category].color;

  return (
    <MapOverlay lat={place.lat} lng={place.lng} zIndex={active ? 100 : 10}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select(place, { pan: false });
        }}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "jeju-root jeju-pop relative grid size-[26px] place-items-center rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.2)] transition duration-150",
          active && "scale-[1.2]",
          selected && "bg-ink",
          dimmed && !active && "opacity-50",
        )}
        style={{ color: selected ? "#fff" : color }}
      >
        <Icon size={13} strokeWidth={2.4} />
        <PinLabel name={place.name} show={active || (!dimmed && level <= 5)} />
      </button>
    </MapOverlay>
  );
}

function StayPin({ place }: { place: Place }) {
  const { level } = useMapCtx();
  const { active } = usePinState(place.id);
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);

  return (
    <MapOverlay lat={place.lat} lng={place.lng} zIndex={active ? 100 : 30}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select(place, { pan: false });
        }}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "jeju-root jeju-pop relative grid size-[34px] place-items-center rounded-full bg-ink text-white shadow-[0_0_0_2.5px_#fff,0_3px_10px_rgba(0,0,0,0.3)] transition duration-150",
          active && "scale-[1.15]",
        )}
      >
        <House size={16} strokeWidth={2.3} />
        <PinLabel name={place.name} sub="숙소" show={active || level <= LABEL_LEVEL} />
      </button>
    </MapOverlay>
  );
}

function SearchPin({ place }: { place: Place }) {
  const { selected, active } = usePinState(place.id);
  const isSaved = useTripStore((s) => Boolean(s.saved[place.id]));
  const select = useTripUiStore((s) => s.select);
  const setHovered = useTripUiStore((s) => s.setHovered);

  return (
    <MapOverlay lat={place.lat} lng={place.lng} zIndex={active ? 100 : 40} yAnchor={1.15}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          select(place, { pan: false });
        }}
        onMouseEnter={() => setHovered(place.id)}
        onMouseLeave={() => setHovered(null)}
        className={cn(
          "jeju-root jeju-pop flex h-8 max-w-[180px] items-center gap-1 rounded-full px-3 text-[13px] font-semibold shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.18)] transition duration-150",
          active ? "scale-[1.08] bg-ink text-white" : "bg-white text-ink",
          selected && "scale-[1.08]",
        )}
      >
        {isSaved ? (
          <Heart size={12} className={cn("shrink-0", active ? "fill-white text-white" : "fill-rausch text-rausch")} />
        ) : null}
        <span className="truncate">{place.name}</span>
      </button>
    </MapOverlay>
  );
}

/* ------------------------------------------------------------ chrome */

function DayLegend({ routes }: { routes: DayRoute[] }) {
  const focusDayId = useTripUiStore((s) => s.focusDayId);
  const setFocusDay = useTripUiStore((s) => s.setFocusDay);
  const requestFit = useTripUiStore((s) => s.requestFit);
  const setTab = useTripUiStore((s) => s.setTab);
  const allPoints = useAllPoints(routes);

  const active = routes.filter((r) => r.stops.length > 0);
  if (active.length === 0) return null;

  return (
    <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-96px)] flex-wrap gap-1.5">
      <LegendChip
        active={!focusDayId}
        onClick={() => {
          setFocusDay(null);
          if (allPoints.length) requestFit(allPoints, 5);
        }}
      >
        전체
      </LegendChip>
      {active.map((r) => (
        <LegendChip
          key={r.day.id}
          active={focusDayId === r.day.id}
          onClick={() => {
            if (focusDayId === r.day.id) {
              setFocusDay(null);
              return;
            }
            setFocusDay(r.day.id);
            setTab("trip");
            requestFit(r.stops.map((s) => s.place), 3);
          }}
        >
          <span className="size-2 rounded-full" style={{ background: r.color }} />
          {r.index + 1}일차
        </LegendChip>
      ))}
    </div>
  );
}

function LegendChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold shadow-air transition active:scale-95",
        active ? "bg-ink text-white" : "bg-white text-ink hover:bg-surface-soft",
      )}
    >
      {children}
    </button>
  );
}

function MapControls({ routes }: { routes: DayRoute[] }) {
  const { map } = useMapCtx();
  const requestFit = useTripUiStore((s) => s.requestFit);
  const setFocusDay = useTripUiStore((s) => s.setFocusDay);
  const allPoints = useAllPoints(routes);

  const btn =
    "grid size-10 place-items-center text-ink transition hover:bg-surface-soft active:bg-surface-strong";

  return (
    <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">
      <div className="flex flex-col overflow-hidden rounded-full bg-white shadow-air">
        <button type="button" aria-label="확대" className={btn} onClick={() => map.setLevel(map.getLevel() - 1, { animate: true })}>
          <Plus size={18} strokeWidth={2.2} />
        </button>
        <span className="mx-2.5 h-px bg-line-soft" />
        <button type="button" aria-label="축소" className={btn} onClick={() => map.setLevel(map.getLevel() + 1, { animate: true })}>
          <Minus size={18} strokeWidth={2.2} />
        </button>
      </div>
      <button
        type="button"
        aria-label="전체 보기"
        title="전체 보기"
        className={cn(btn, "rounded-full bg-white shadow-air")}
        onClick={() => {
          setFocusDay(null);
          if (allPoints.length) requestFit(allPoints, 5);
          else requestFit([
            { lat: 33.56, lng: 126.16 },
            { lat: 33.2, lng: 126.95 },
          ]);
        }}
      >
        <Maximize2 size={16} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ detail */

function PhotoMosaic({ place }: { place: Place }) {
  const { photos, loading } = usePlacePhotos(place);
  if (!loading && photos.length === 0) return null;
  const many = photos.length >= 3;
  return (
    <div
      className={cn(
        "group hidden h-[184px] gap-1 overflow-hidden lg:grid",
        many ? "grid-cols-3 grid-rows-2" : "grid-cols-1",
      )}
    >
      <PlacePhoto
        place={place}
        index={0}
        sizes="400px"
        priority
        controls
        className={cn("size-full", many && "col-span-2 row-span-2")}
        iconSize={30}
      />
      {many ? (
        <>
          <PlacePhoto place={place} index={1} sizes="140px" className="size-full" />
          <PlacePhoto place={place} index={2} sizes="140px" className="size-full" />
        </>
      ) : null}
    </div>
  );
}

function PlaceDetailCard({ routes }: { routes: DayRoute[] }) {
  const selected = useTripUiStore((s) => s.selected);
  const select = useTripUiStore((s) => s.select);
  const showToast = useTripUiStore((s) => s.showToast);
  const savedPlace = useTripStore((s) => (selected ? s.saved[selected.id] : undefined));
  const stayId = useTripStore((s) => s.stayId);
  const toggleSave = useTripStore((s) => s.toggleSave);
  const updateMemo = useTripStore((s) => s.updateMemo);
  const setStayMinutes = useTripStore((s) => s.setStayMinutes);

  if (!selected) return null;
  const place = savedPlace ?? selected;
  const isSaved = Boolean(savedPlace);
  const isStay = stayId === place.id;

  const route = routes.find((r) => r.day.placeIds.includes(place.id));
  const stop = route?.stops.find((s) => s.kind === "place" && s.place.id === place.id);
  const stayMinutes = savedPlace ? stayMinutesOf(savedPlace) : DEFAULT_STAY_MINUTES[place.category];

  return (
    <div
      key={place.id}
      className="jeju-rise jeju-scroll absolute inset-x-3 bottom-3 z-20 max-h-[calc(100%-24px)] overflow-y-auto rounded-[20px] bg-white shadow-air-lg lg:inset-x-auto lg:bottom-5 lg:left-5 lg:max-h-[calc(100%-40px)] lg:w-[400px]"
      onClick={(e) => e.stopPropagation()}
    >
      <PhotoMosaic place={place} />

      <button
        type="button"
        aria-label="닫기"
        onClick={() => select(null)}
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-white text-ink shadow-air transition hover:scale-105"
      >
        <X size={16} strokeWidth={2.4} />
      </button>

      <div className="p-5">
        <div className="flex items-center gap-1.5 pr-10 text-[12px] font-medium text-ink-muted">
          {route && stop ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
              style={{ background: `${route.color}17`, color: route.color }}
            >
              {route.index + 1}일차 · {stop.number}번째
              {stop.arrive !== null ? ` · ${formatClock(stop.arrive)}` : ""}
            </span>
          ) : null}
          {isStay ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-semibold text-white">
              <House size={11} strokeWidth={2.6} />
              우리 숙소
            </span>
          ) : null}
          <span className="truncate">{shortCategory(place.categoryName)}</span>
        </div>
        <h3 className="mt-1.5 pr-8 text-[20px] font-semibold leading-[26px] tracking-[-0.2px] text-ink">
          {place.name}
        </h3>

        <div className="mt-2.5 space-y-1 text-[13px] leading-5 text-ink-body">
          <p className="flex gap-2">
            <MapPin size={14} className="mt-[3px] shrink-0 text-ink-soft" />
            <span>{shortAddress(place.address)}</span>
          </p>
          {place.phone ? (
            <p className="flex gap-2">
              <Phone size={14} className="mt-[3px] shrink-0 text-ink-soft" />
              <a href={`tel:${place.phone}`} className="hover:underline">
                {place.phone}
              </a>
            </p>
          ) : null}
        </div>

        {isSaved ? (
          <textarea
            key={`memo-${place.id}`}
            defaultValue={savedPlace?.memo ?? ""}
            onChange={(e) => updateMemo(place.id, e.target.value)}
            placeholder="메모 남기기 · 예) 웨이팅 김, 주차 가능, 11시 오픈"
            rows={3}
            className="mt-4 block w-full resize-none rounded-xl border border-line px-3 py-2.5 text-[13px] leading-5 text-ink outline-none transition placeholder:text-ink-soft focus:border-ink focus:shadow-[inset_0_0_0_1px_#222]"
          />
        ) : null}

        {isSaved && !isStay ? (
          <div className="mt-4">
            <p className="text-[12px] font-semibold text-ink-muted">머무는 시간</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STAY_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setStayMinutes(place.id, m)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[13px] font-medium transition",
                    m === stayMinutes
                      ? "border-ink bg-ink text-white"
                      : "border-line text-ink hover:border-ink",
                  )}
                >
                  {formatStay(m)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const now = toggleSave(place);
              showToast(now ? `‘${place.name}’ 담았어요` : `‘${place.name}’ 담기 취소`);
            }}
            aria-pressed={isSaved}
            className={cn(
              "inline-flex h-12 items-center justify-center gap-1.5 rounded-lg border px-4 text-[15px] font-semibold transition active:scale-[0.98]",
              isSaved ? "border-line text-ink hover:border-ink" : "border-ink text-ink hover:bg-surface-soft",
            )}
          >
            <Heart size={17} className={isSaved ? "fill-rausch text-rausch" : "text-ink"} />
            {isSaved ? "담음" : "담기"}
          </button>
          {!isStay ? <ScheduleButton place={place} variant="primary" /> : <div className="flex-1" />}
          {place.url ? (
            <a
              href={place.url}
              target="_blank"
              rel="noreferrer"
              aria-label="카카오맵에서 보기"
              title="카카오맵에서 보기"
              className="grid size-12 shrink-0 place-items-center rounded-lg border border-line text-ink transition hover:border-ink"
            >
              <ExternalLink size={17} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
