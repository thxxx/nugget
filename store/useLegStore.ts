"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { estimateDrive, legKey } from "@/lib/jeju/geo";
import type { Leg, LatLngTuple } from "@/lib/jeju/types";

type Point = { lat: number; lng: number };

type LegState = {
  legs: Record<string, Leg>;
  request: (pairs: Array<[Point, Point]>) => void;
};

const inflight = new Set<string>();

export const useLegStore = create<LegState>()(
  persist(
    (set, get) => ({
      legs: {},
      request: (pairs) => {
        for (const [a, b] of pairs) {
          const key = legKey(a, b);
          const existing = get().legs[key];
          if (existing && existing.status !== "loading") continue;
          if (inflight.has(key)) continue;
          inflight.add(key);

          set((s) => ({ legs: { ...s.legs, [key]: { status: "loading" } } }));

          const fallback = (): Exclude<Leg, { status: "loading" }> => ({
            status: "estimate",
            ...estimateDrive(a, b),
            path: [
              [a.lat, a.lng],
              [b.lat, b.lng],
            ],
          });

          const sameSpot = Math.abs(a.lat - b.lat) < 0.00005 && Math.abs(a.lng - b.lng) < 0.00005;
          if (sameSpot) {
            inflight.delete(key);
            set((s) => ({
              legs: { ...s.legs, [key]: { status: "ok", distance: 0, duration: 0, path: [] } },
            }));
            continue;
          }

          const params = new URLSearchParams({
            origin: `${a.lng},${a.lat}`,
            destination: `${b.lng},${b.lat}`,
          });

          fetch(`/api/jeju/directions?${params}`)
            .then(async (res) => {
              if (!res.ok) return fallback();
              const data = (await res.json()) as {
                distance: number;
                duration: number;
                taxi: number | null;
                path: LatLngTuple[];
              };
              return {
                status: "ok",
                distance: data.distance,
                duration: data.duration,
                taxi: data.taxi ?? undefined,
                path: data.path.length ? data.path : fallback().path,
              } as Leg;
            })
            .catch(fallback)
            .then((leg) => {
              inflight.delete(key);
              set((s) => ({ legs: { ...s.legs, [key]: leg } }));
            });
        }
      },
    }),
    {
      name: "jeju-trip-legs-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Only keep real routes; estimates and in-flight states are retried next session.
      partialize: (s) => ({
        legs: Object.fromEntries(Object.entries(s.legs).filter(([, v]) => v.status === "ok")),
      }),
    },
  ),
);
