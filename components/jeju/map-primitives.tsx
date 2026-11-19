"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import type { KCustomOverlay, KMap, KMaps, KPolyline } from "@/lib/jeju/kakao";
import type { LatLngTuple } from "@/lib/jeju/types";

type MapCtx = { map: KMap; maps: KMaps; level: number };

export const MapContext = createContext<MapCtx | null>(null);

export function useMapCtx() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error("useMapCtx must be used inside <MapContext.Provider>");
  return ctx;
}

/** Renders React children into a Kakao CustomOverlay at the given position. */
export function MapOverlay({
  lat,
  lng,
  zIndex = 1,
  xAnchor = 0.5,
  yAnchor = 0.5,
  children,
}: {
  lat: number;
  lng: number;
  zIndex?: number;
  xAnchor?: number;
  yAnchor?: number;
  children: ReactNode;
}) {
  const { map, maps } = useMapCtx();
  const [el] = useState(() => document.createElement("div"));
  const overlayRef = useRef<KCustomOverlay | null>(null);
  const init = useRef({ lat, lng, zIndex, xAnchor, yAnchor });

  useEffect(() => {
    const { lat: a, lng: b, zIndex: z, xAnchor: x, yAnchor: y } = init.current;
    const overlay = new maps.CustomOverlay({
      position: new maps.LatLng(a, b),
      content: el,
      xAnchor: x,
      yAnchor: y,
      zIndex: z,
      clickable: true,
    });
    overlay.setMap(map);
    overlayRef.current = overlay;
    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map, maps, el]);

  useEffect(() => {
    overlayRef.current?.setPosition(new maps.LatLng(lat, lng));
  }, [maps, lat, lng]);

  useEffect(() => {
    overlayRef.current?.setZIndex(zIndex);
  }, [zIndex]);

  return createPortal(children, el);
}

/** A route line drawn as a white halo + colored stroke. */
export function RouteLine({
  path,
  color,
  dimmed,
  dashed,
}: {
  path: LatLngTuple[];
  color: string;
  dimmed: boolean;
  dashed: boolean;
}) {
  const { map, maps } = useMapCtx();
  const lines = useRef<{ halo: KPolyline; line: KPolyline } | null>(null);
  const dimmedRef = useRef(dimmed);

  useEffect(() => {
    const latLngs = path.map(([lat, lng]) => new maps.LatLng(lat, lng));
    const dim = dimmedRef.current;
    const halo = new maps.Polyline({
      path: latLngs,
      strokeWeight: 8,
      strokeColor: "#ffffff",
      strokeOpacity: dim ? 0.35 : 0.95,
      strokeStyle: "solid",
      zIndex: 1,
    });
    const line = new maps.Polyline({
      path: latLngs,
      strokeWeight: 4.5,
      strokeColor: color,
      strokeOpacity: dim ? 0.22 : 0.95,
      strokeStyle: dashed ? "shortdash" : "solid",
      zIndex: 2,
    });
    halo.setMap(map);
    line.setMap(map);
    lines.current = { halo, line };
    return () => {
      halo.setMap(null);
      line.setMap(null);
      lines.current = null;
    };
  }, [map, maps, path, color, dashed]);

  useEffect(() => {
    dimmedRef.current = dimmed;
    lines.current?.halo.setOptions({ strokeOpacity: dimmed ? 0.35 : 0.95 });
    lines.current?.line.setOptions({ strokeOpacity: dimmed ? 0.22 : 0.95 });
  }, [dimmed]);

  return null;
}
