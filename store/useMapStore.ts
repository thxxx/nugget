import { create } from "zustand";

import type { MapFeedPlace, SearchPlaceItem, VisitStatus } from "@/lib/types/domain";

type SelectedPlace = {
  externalPlaceKey: string;
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  telephone: string;
  link: string;
  rawMapx: number;
  rawMapy: number;
  latitude: number;
  longitude: number;
  saveId: number | null;
  myMemo: string;
  myVisitStatus: VisitStatus;
  myIsPublic: boolean;
  myRating: 1 | 2 | 3;
  myTags: string[];
  owners: MapFeedPlace["owners"];
};

type MapStore = {
  searchQuery: string;
  searchResults: SearchPlaceItem[];
  feedPlaces: MapFeedPlace[];
  selectedPlace: SelectedPlace | null;
  setSearchQuery: (searchQuery: string) => void;
  setSearchResults: (searchResults: SearchPlaceItem[]) => void;
  setFeedPlaces: (feedPlaces: MapFeedPlace[]) => void;
  setSelectedPlace: (selectedPlace: SelectedPlace | null) => void;
};

export const useMapStore = create<MapStore>((set) => ({
  searchQuery: "",
  searchResults: [],
  feedPlaces: [],
  selectedPlace: null,
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
  },
  setSearchResults: (searchResults) => {
    set({ searchResults });
  },
  setFeedPlaces: (feedPlaces) => {
    set({ feedPlaces });
  },
  setSelectedPlace: (selectedPlace) => {
    set({ selectedPlace });
  },
}));

export type { SelectedPlace };
