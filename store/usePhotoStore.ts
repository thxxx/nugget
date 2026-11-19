"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { areaOf } from "@/lib/jeju/category";
import type { Place, PlacePhotoItem } from "@/lib/jeju/types";

type Entry =
  | { status: "loading"; q: string }
  | { status: "done"; q: string; photos: PlacePhotoItem[]; ok?: boolean };

/** The image-search query for a place: scenery for sights, name + town for shops. */
export function photoQueryOf(place: Place) {
  if (place.photoQuery) return place.photoQuery;
  if (place.category === "sight") return `${place.name} 풍경`;
  return `${place.name} ${areaOf(place.address)}`.trim();
}

type PhotoState = {
  entries: Record<string, Entry>;
  /** User-chosen cover photo index per place. */
  cover: Record<string, number>;
  request: (place: Place) => void;
  setCover: (placeId: string, index: number) => void;
};

const MAX_PARALLEL = 4;
let running = 0;
const queue: Array<() => Promise<void>> = [];

function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    const job = queue.shift()!;
    running++;
    job().finally(() => {
      running--;
      pump();
    });
  }
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      entries: {},
      cover: {},
      setCover: (placeId, index) => set((s) => ({ cover: { ...s.cover, [placeId]: index } })),
      request: (place) => {
        const q = photoQueryOf(place);
        const existing = get().entries[place.id];
        if (existing && existing.q === q) return;
        set((s) => ({ entries: { ...s.entries, [place.id]: { status: "loading", q } } }));

        const params = new URLSearchParams({ q, fallback: `${place.name} 제주` });

        queue.push(async () => {
          let photos: PlacePhotoItem[] = [];
          let ok = false;
          try {
            const res = await fetch(`/api/jeju/photos?${params}`);
            if (res.ok) {
              photos = ((await res.json()) as { photos: PlacePhotoItem[] }).photos ?? [];
              ok = true;
            }
          } catch {
            ok = false;
          }
          set((s) => ({
            entries: { ...s.entries, [place.id]: { status: "done", q, photos, ok } },
          }));
        });
        pump();
      },
    }),
    {
      name: "jeju-trip-photos-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        cover: s.cover,
        entries: Object.fromEntries(
          // Failed or empty lookups are retried next visit instead of being cached forever.
          Object.entries(s.entries).filter(
            ([, v]) => v.status === "done" && v.ok !== false && v.photos.length > 0,
          ),
        ),
      }),
    },
  ),
);

export function usePlacePhotos(place: Place | null | undefined) {
  const entry = usePhotoStore((s) => (place ? s.entries[place.id] : undefined));
  const request = usePhotoStore((s) => s.request);

  const q = place ? photoQueryOf(place) : "";
  const stale = !entry || entry.q !== q;

  useEffect(() => {
    if (place && stale) request(place);
  }, [place, stale, request]);

  const cover = usePhotoStore((s) => (place ? (s.cover[place.id] ?? 0) : 0));
  const photos = !stale && entry?.status === "done" ? entry.photos : [];
  const start = photos.length ? cover % photos.length : 0;

  return {
    loading: stale || entry.status === "loading",
    /** Photos rotated so the chosen cover comes first. */
    photos: start ? [...photos.slice(start), ...photos.slice(0, start)] : photos,
    cover: start,
    count: photos.length,
  };
}
