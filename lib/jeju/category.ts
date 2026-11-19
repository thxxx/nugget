import type { PlaceCategory } from "@/lib/jeju/types";

export const CATEGORY_META: Record<
  PlaceCategory,
  { label: string; tint: string; color: string }
> = {
  food: { label: "맛집", tint: "#fff1ec", color: "#e2572b" },
  cafe: { label: "카페", tint: "#f6f0ea", color: "#8a5a3b" },
  sight: { label: "볼거리", tint: "#eaf6f4", color: "#0b8a7d" },
  stay: { label: "숙소", tint: "#eef0fb", color: "#4c5bd4" },
  etc: { label: "기타", tint: "#f2f2f2", color: "#6a6a6a" },
};

/** Default planned stay per category, in minutes. */
export const DEFAULT_STAY_MINUTES: Record<PlaceCategory, number> = {
  food: 60,
  cafe: 50,
  sight: 90,
  stay: 0,
  etc: 60,
};

export const STAY_OPTIONS = [30, 60, 90, 120, 180];

export function formatStay(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

export const CATEGORY_FILTERS: Array<PlaceCategory | "all"> = [
  "all",
  "food",
  "cafe",
  "sight",
  "stay",
];

export function inferCategory(groupCode: string, categoryName: string): PlaceCategory {
  if (groupCode === "AD5" || categoryName.includes("숙박")) return "stay";
  if (groupCode === "CE7" || categoryName.includes("카페")) return "cafe";
  if (groupCode === "FD6" || categoryName.startsWith("음식점")) return "food";
  if (
    groupCode === "AT4" ||
    groupCode === "CT1" ||
    /여행|관광|명소|문화|미술관|박물관|해수욕장|해변|오름|공원|테마파크|자연/.test(categoryName)
  ) {
    return "sight";
  }
  return "etc";
}

/** "음식점 > 한식 > 육류,고기" → "육류·고기" */
export function shortCategory(categoryName: string) {
  const parts = categoryName.split(">").map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  return last.replace(/,/g, "·");
}

/** "제주특별자치도 서귀포시 표선면 토산중앙로 22" → "서귀포시 표선면 토산중앙로 22" */
export function shortAddress(address: string) {
  return address.replace(/^제주특별자치도\s*/, "");
}

/** Town-level area, e.g. "표선면" / "애월읍" / "제주시" */
export function areaOf(address: string) {
  const parts = shortAddress(address).split(/\s+/);
  const town = parts.find((p) => /(읍|면|동)$/.test(p));
  return town ?? parts[0] ?? "";
}
