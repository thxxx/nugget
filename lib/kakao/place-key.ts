import { createHash } from "crypto";

export function getExternalPlaceKey(input: {
  id?: string;
  title: string;
  roadAddress?: string;
  x?: number | string;
  y?: number | string;
}) {
  const placeId = input.id?.trim();
  if (placeId) {
    return `kakao-place:${placeId}`;
  }

  const digestBase = [
    input.title.trim().toLowerCase(),
    (input.roadAddress ?? "").trim().toLowerCase(),
    String(input.x ?? ""),
    String(input.y ?? ""),
  ].join("|");

  const digest = createHash("sha256").update(digestBase).digest("hex").slice(0, 40);
  return `hash:${digest}`;
}
