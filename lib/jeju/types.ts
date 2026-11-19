export type PlaceCategory = "food" | "cafe" | "sight" | "stay" | "etc";

export type Place = {
  id: string;
  name: string;
  categoryName: string;
  category: PlaceCategory;
  address: string;
  phone: string;
  url: string;
  lat: number;
  lng: number;
  /** Optional image-search query used for the place's photos. */
  photoQuery?: string;
};

export type SavedPlace = Place & {
  memo: string;
  savedAt: number;
  /** How long we plan to stay, in minutes. Falls back to a per-category default. */
  stayMinutes?: number;
};

export type TripDay = {
  id: string;
  placeIds: string[];
  startFromStay: boolean;
  endAtStay: boolean;
  /** "HH:MM" departure time for the day. */
  startTime: string;
};

export type PlacePhotoItem = { src: string; thumb: string; w: number; h: number };

export type LatLngTuple = [number, number];

export type Leg =
  | { status: "loading" }
  | {
      status: "ok" | "estimate";
      distance: number;
      duration: number;
      taxi?: number;
      path: LatLngTuple[];
    };

export type SearchResponse = {
  items: Place[];
  total: number;
  isEnd: boolean;
};
