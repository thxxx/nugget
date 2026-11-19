"use client";

import { create } from "zustand";

import type { Place } from "@/lib/jeju/types";

export type PanelTab = "saved" | "trip";

type Toast = { id: number; message: string; actionLabel?: string; onAction?: () => void };

type FitRequest = { id: number; points: Array<{ lat: number; lng: number }>; minLevel?: number };

type TripUiState = {
  tab: PanelTab;
  setTab: (tab: PanelTab) => void;

  searchOpen: boolean;
  searchResults: Place[];
  setSearch: (open: boolean, results?: Place[]) => void;

  selected: Place | null;
  select: (place: Place | null, opts?: { pan?: boolean }) => void;
  panRequest: { id: number; lat: number; lng: number } | null;

  hoveredId: string | null;
  setHovered: (id: string | null) => void;

  focusDayId: string | null;
  setFocusDay: (id: string | null) => void;
  hoverDayId: string | null;
  setHoverDay: (id: string | null) => void;

  fitRequest: FitRequest | null;
  requestFit: (points: Array<{ lat: number; lng: number }>, minLevel?: number) => void;

  toast: Toast | null;
  showToast: (message: string, action?: { label: string; onAction: () => void }) => void;
  hideToast: () => void;
};

let seq = 0;

export const useTripUiStore = create<TripUiState>()((set) => ({
  tab: "saved",
  setTab: (tab) => set({ tab }),

  searchOpen: false,
  searchResults: [],
  setSearch: (open, results) =>
    set((s) => ({ searchOpen: open, searchResults: results ?? (open ? s.searchResults : []) })),

  selected: null,
  select: (place, opts) =>
    set({
      selected: place,
      panRequest:
        place && opts?.pan !== false ? { id: ++seq, lat: place.lat, lng: place.lng } : null,
    }),
  panRequest: null,

  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id }),

  focusDayId: null,
  setFocusDay: (id) => set({ focusDayId: id }),
  hoverDayId: null,
  setHoverDay: (id) => set({ hoverDayId: id }),

  fitRequest: null,
  requestFit: (points, minLevel) => set({ fitRequest: { id: ++seq, points, minLevel } }),

  toast: null,
  showToast: (message, action) =>
    set({
      toast: { id: ++seq, message, actionLabel: action?.label, onAction: action?.onAction },
    }),
  hideToast: () => set({ toast: null }),
}));
