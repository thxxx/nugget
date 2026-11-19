"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { SEED_PLACES, SEED_STAY_ID } from "@/lib/jeju/seed";
import type { Place, SavedPlace, TripDay } from "@/lib/jeju/types";

const newDayId = () => `day-${Math.random().toString(36).slice(2, 9)}`;

export const DEFAULT_START_TIME = "10:00";

const emptyDay = (): TripDay => ({
  id: newDayId(),
  placeIds: [],
  startFromStay: true,
  endAtStay: true,
  startTime: DEFAULT_START_TIME,
});

function seededState() {
  const now = Date.now();
  const saved: Record<string, SavedPlace> = {};
  SEED_PLACES.forEach((p, i) => {
    saved[p.id] = { ...p, savedAt: now - i };
  });
  return {
    saved,
    savedOrder: SEED_PLACES.map((p) => p.id),
    stayId: saved[SEED_STAY_ID] ? SEED_STAY_ID : null,
  };
}

type TripState = {
  saved: Record<string, SavedPlace>;
  savedOrder: string[];
  days: TripDay[];
  stayId: string | null;
  startDate: string | null;

  save: (place: Place) => void;
  unsave: (id: string) => void;
  toggleSave: (place: Place) => boolean;
  updateMemo: (id: string, memo: string) => void;
  setStayMinutes: (id: string, minutes: number) => void;
  setStay: (id: string | null) => void;

  addToDay: (place: Place, dayId: string) => void;
  addToNewDay: (place: Place) => string;
  removeFromDays: (placeId: string) => void;
  setDays: (days: TripDay[]) => void;
  setDayPlaces: (dayId: string, placeIds: string[]) => void;
  setDayStartTime: (dayId: string, time: string) => void;
  addDay: () => string;
  removeDay: (dayId: string) => void;
  toggleDayStay: (dayId: string, which: "start" | "end") => void;
  setStartDate: (date: string | null) => void;
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      ...seededState(),
      days: [emptyDay(), emptyDay()],
      startDate: null,

      save: (place) => {
        if (get().saved[place.id]) return;
        set((s) => ({
          saved: { ...s.saved, [place.id]: { ...place, memo: "", savedAt: Date.now() } },
          savedOrder: [place.id, ...s.savedOrder],
          // First lodging saved becomes the trip's stay automatically.
          stayId: s.stayId ?? (place.category === "stay" ? place.id : null),
        }));
      },

      unsave: (id) =>
        set((s) => {
          const saved = { ...s.saved };
          delete saved[id];
          return {
            saved,
            savedOrder: s.savedOrder.filter((x) => x !== id),
            days: s.days.map((d) => ({ ...d, placeIds: d.placeIds.filter((x) => x !== id) })),
            stayId: s.stayId === id ? null : s.stayId,
          };
        }),

      toggleSave: (place) => {
        if (get().saved[place.id]) {
          get().unsave(place.id);
          return false;
        }
        get().save(place);
        return true;
      },

      updateMemo: (id, memo) =>
        set((s) =>
          s.saved[id] ? { saved: { ...s.saved, [id]: { ...s.saved[id], memo } } } : s,
        ),

      setStayMinutes: (id, minutes) =>
        set((s) =>
          s.saved[id]
            ? { saved: { ...s.saved, [id]: { ...s.saved[id], stayMinutes: minutes } } }
            : s,
        ),

      setStay: (id) => set({ stayId: id }),

      addToDay: (place, dayId) => {
        get().save(place);
        set((s) => ({
          days: s.days.map((d) => {
            const without = d.placeIds.filter((x) => x !== place.id);
            return d.id === dayId ? { ...d, placeIds: [...without, place.id] } : { ...d, placeIds: without };
          }),
        }));
      },

      addToNewDay: (place) => {
        const id = get().addDay();
        get().addToDay(place, id);
        return id;
      },

      removeFromDays: (placeId) =>
        set((s) => ({
          days: s.days.map((d) => ({ ...d, placeIds: d.placeIds.filter((x) => x !== placeId) })),
        })),

      setDays: (days) => set({ days }),

      setDayPlaces: (dayId, placeIds) =>
        set((s) => ({ days: s.days.map((d) => (d.id === dayId ? { ...d, placeIds } : d)) })),

      setDayStartTime: (dayId, time) =>
        set((s) => ({ days: s.days.map((d) => (d.id === dayId ? { ...d, startTime: time } : d)) })),

      addDay: () => {
        const day = emptyDay();
        set((s) => ({ days: [...s.days, day] }));
        return day.id;
      },

      removeDay: (dayId) =>
        set((s) => {
          const days = s.days.filter((d) => d.id !== dayId);
          return { days: days.length ? days : [emptyDay()] };
        }),

      toggleDayStay: (dayId, which) =>
        set((s) => ({
          days: s.days.map((d) =>
            d.id !== dayId
              ? d
              : which === "start"
                ? { ...d, startFromStay: !d.startFromStay }
                : { ...d, endAtStay: !d.endAtStay },
          ),
        })),

      setStartDate: (date) => set({ startDate: date }),
    }),
    {
      name: "jeju-trip-v1",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        saved: s.saved,
        savedOrder: s.savedOrder,
        days: s.days,
        stayId: s.stayId,
        startDate: s.startDate,
      }),
      migrate: (persisted, version) => {
        const state = persisted as {
          saved: Record<string, SavedPlace>;
          savedOrder: string[];
          days: Array<Partial<TripDay> & { id: string; placeIds: string[] }>;
          stayId: string | null;
          startDate: string | null;
        };
        if (version < 2) {
          // v2: day start times + recommended places merged into an existing list.
          state.days = state.days.map((d) => ({
            startFromStay: true,
            endAtStay: true,
            startTime: DEFAULT_START_TIME,
            ...d,
          }));
          const seed = seededState();
          for (const id of seed.savedOrder) {
            if (state.saved[id]) continue;
            state.saved[id] = seed.saved[id];
            state.savedOrder.push(id);
          }
          if (!state.stayId && seed.stayId) state.stayId = seed.stayId;
        }
        return state as unknown as TripState;
      },
    },
  ),
);
