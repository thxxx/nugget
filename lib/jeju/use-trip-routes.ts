"use client";

import { useEffect, useMemo } from "react";

import { DEFAULT_STAY_MINUTES } from "@/lib/jeju/category";
import { dayColor } from "@/lib/jeju/colors";
import { legKey } from "@/lib/jeju/geo";
import type { Leg, SavedPlace, TripDay } from "@/lib/jeju/types";
import { useLegStore } from "@/store/useLegStore";
import { useTripStore } from "@/store/useTripStore";

export type StopKind = "stay-start" | "place" | "stay-end";

export type Stop = {
  kind: StopKind;
  place: SavedPlace;
  number: number | null;
  stayMinutes: number;
  /** minutes from midnight, null while legs are still loading */
  arrive: number | null;
  depart: number | null;
};

export type DayRoute = {
  day: TripDay;
  index: number;
  color: string;
  stops: Stop[];
  /** legs[i] connects stops[i] → stops[i + 1] */
  legs: Leg[];
  totalDuration: number;
  totalDistance: number;
  pending: boolean;
  hasEstimate: boolean;
  startTime: number;
  endTime: number | null;
};

export function stayMinutesOf(place: SavedPlace) {
  return place.stayMinutes ?? DEFAULT_STAY_MINUTES[place.category];
}

export function parseClock(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (Number.isFinite(h) ? h : 10) * 60 + (Number.isFinite(m) ? m : 0);
}

export function formatClock(minutes: number) {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

const roundUp5 = (minutes: number) => Math.ceil(minutes / 5) * 5;

export function useTripRoutes(): DayRoute[] {
  const days = useTripStore((s) => s.days);
  const saved = useTripStore((s) => s.saved);
  const stayId = useTripStore((s) => s.stayId);
  const legs = useLegStore((s) => s.legs);
  const request = useLegStore((s) => s.request);

  const skeleton = useMemo(() => {
    const stay = stayId ? saved[stayId] : undefined;
    return days.map((day, index) => {
      const places = day.placeIds.map((id) => saved[id]).filter(Boolean);
      const stops: Array<Pick<Stop, "kind" | "place" | "number">> = places.map((place, i) => ({
        kind: "place",
        place,
        number: i + 1,
      }));
      if (stay && places.length > 0) {
        if (day.startFromStay && places[0].id !== stay.id) {
          stops.unshift({ kind: "stay-start", place: stay, number: null });
        }
        if (day.endAtStay && places[places.length - 1].id !== stay.id) {
          stops.push({ kind: "stay-end", place: stay, number: null });
        }
      }
      const keys = stops.slice(1).map((stop, i) => legKey(stops[i].place, stop.place));
      return { day, index, color: dayColor(index), stops, keys };
    });
  }, [days, saved, stayId]);

  const allKeys = skeleton.flatMap((d) => d.keys).join("|");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const pairs = skeleton.flatMap((d) =>
        d.stops.slice(1).map((stop, i) => [d.stops[i].place, stop.place] as [SavedPlace, SavedPlace]),
      );
      request(pairs);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKeys, request]);

  return useMemo(
    () =>
      skeleton.map(({ keys, stops: rawStops, ...rest }) => {
        const dayLegs: Leg[] = keys.map((k) => legs[k] ?? { status: "loading" });
        let totalDuration = 0;
        let totalDistance = 0;
        let pending = false;
        let hasEstimate = false;
        for (const leg of dayLegs) {
          if (leg.status === "loading") {
            pending = true;
            continue;
          }
          if (leg.status === "estimate") hasEstimate = true;
          totalDuration += leg.duration;
          totalDistance += leg.distance;
        }

        const startTime = parseClock(rest.day.startTime ?? "10:00");
        const stops: Stop[] = [];
        rawStops.forEach((raw, i) => {
          const stayMinutes = raw.kind === "place" ? stayMinutesOf(raw.place) : 0;
          let arrive: number | null;
          if (i === 0) {
            arrive = raw.kind === "stay-start" ? null : startTime;
          } else {
            const prev = stops[i - 1];
            const leg = dayLegs[i - 1];
            const prevDepart = prev.depart;
            arrive =
              prevDepart === null || leg.status === "loading"
                ? null
                : prevDepart + roundUp5(leg.duration / 60);
          }
          const depart =
            raw.kind === "stay-end"
              ? null
              : raw.kind === "stay-start"
                ? startTime
                : arrive === null
                  ? null
                  : arrive + stayMinutes;
          stops.push({ ...raw, stayMinutes, arrive, depart });
        });

        const last = stops[stops.length - 1];
        const endTime = last ? (last.kind === "stay-end" ? last.arrive : last.depart) : null;

        return {
          ...rest,
          stops,
          legs: dayLegs,
          totalDuration,
          totalDistance,
          pending,
          hasEstimate,
          startTime,
          endTime,
        };
      }),
    [skeleton, legs],
  );
}

export function kakaoDirectionsUrl(
  a: { name: string; lat: number; lng: number },
  b: { name: string; lat: number; lng: number },
) {
  const part = (p: { name: string; lat: number; lng: number }) =>
    `${encodeURIComponent(p.name.replace(/[,/]/g, " "))},${p.lat},${p.lng}`;
  return `https://map.kakao.com/link/from/${part(a)}/to/${part(b)}`;
}
