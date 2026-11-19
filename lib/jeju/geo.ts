import type { LatLngTuple } from "@/lib/jeju/types";

type Point = { lat: number; lng: number };

export const JEJU_CENTER: Point = { lat: 33.375, lng: 126.56 };

/** Jeju island bounding box (lng/lat) incl. Udo & Marado: "minX,minY,maxX,maxY" */
export const JEJU_RECT = "126.08,33.10,127.00,33.60";

export function haversine(a: Point, b: Point) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough driving estimate when the directions API cannot route (ferry, etc.) */
export function estimateDrive(a: Point, b: Point) {
  const distance = haversine(a, b) * 1.35;
  const duration = (distance / 1000 / 38) * 3600 + 120;
  return { distance: Math.round(distance), duration: Math.round(duration) };
}

export function legKey(a: Point, b: Point) {
  return `${a.lat.toFixed(5)},${a.lng.toFixed(5)}>${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
}

/** Ramer–Douglas–Peucker polyline simplification on [lat, lng] tuples. */
export function simplifyPath(points: LatLngTuple[], tolerance = 0.00006): LatLngTuple[] {
  if (points.length <= 2) return points;

  const sqTol = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = segmentSqDist(points[i], points[first], points[last]);
      if (sq > maxSq) {
        maxSq = sq;
        index = i;
      }
    }
    if (index !== -1 && maxSq > sqTol) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i] === 1);
}

function segmentSqDist(p: LatLngTuple, a: LatLngTuple, b: LatLngTuple) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** Nearest-neighbour ordering followed by 2-opt, anchored at an optional start point. */
export function optimizeOrder<T extends Point>(items: T[], start?: Point | null, end?: Point | null): T[] {
  if (items.length <= 2 && !start) return items;

  const remaining = [...items];
  const ordered: T[] = [];
  let cursor: Point = start ?? remaining.shift()!;
  if (!start) ordered.push(cursor as T);

  while (remaining.length) {
    let best = 0;
    let bestDist = Infinity;
    remaining.forEach((item, i) => {
      const d = haversine(cursor, item);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    cursor = remaining.splice(best, 1)[0];
    ordered.push(cursor as T);
  }

  const route: Point[] = [...(start ? [start] : []), ...ordered, ...(end ? [end] : [])];
  const offset = start ? 1 : 0;
  const lastMovable = offset + ordered.length - 1;
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = offset; i < lastMovable; i++) {
      for (let k = i + 1; k <= lastMovable; k++) {
        const before = i > 0 ? route[i - 1] : null;
        const after = k + 1 < route.length ? route[k + 1] : null;
        const current =
          (before ? haversine(before, route[i]) : 0) + (after ? haversine(route[k], after) : 0);
        const swapped =
          (before ? haversine(before, route[k]) : 0) + (after ? haversine(route[i], after) : 0);
        if (swapped + 1 < current) {
          const reversed = route.slice(i, k + 1).reverse();
          route.splice(i, k - i + 1, ...reversed);
          improved = true;
        }
      }
    }
  }

  return route.slice(offset, offset + ordered.length) as T[];
}

/** Point halfway along a polyline (by distance). */
export function pathMidpoint(path: LatLngTuple[]): Point | null {
  if (path.length === 0) return null;
  if (path.length === 1) return { lat: path[0][0], lng: path[0][1] };
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = haversine(
      { lat: path[i - 1][0], lng: path[i - 1][1] },
      { lat: path[i][0], lng: path[i][1] },
    );
    seg.push(d);
    total += d;
  }
  let target = total / 2;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i]) {
      const t = seg[i] === 0 ? 0 : target / seg[i];
      return {
        lat: path[i][0] + (path[i + 1][0] - path[i][0]) * t,
        lng: path[i][1] + (path[i + 1][1] - path[i][1]) * t,
      };
    }
    target -= seg[i];
  }
  const last = path[path.length - 1];
  return { lat: last[0], lng: last[1] };
}
