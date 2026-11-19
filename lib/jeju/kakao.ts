"use client";

import { loadKakaoMapScript } from "@/lib/kakao/load-script";

/* Minimal typings for the parts of Kakao Maps JS SDK used by /jeju. */

export type KLatLng = { getLat(): number; getLng(): number };

export type KMap = {
  panTo(latLng: KLatLng): void;
  setCenter(latLng: KLatLng): void;
  getLevel(): number;
  setLevel(level: number, opts?: { animate?: boolean | { duration: number }; anchor?: KLatLng }): void;
  setBounds(bounds: KLatLngBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  relayout(): void;
  setMaxLevel(level: number): void;
  getProjection(): {
    pointFromCoords(latLng: KLatLng): { x: number; y: number };
    coordsFromPoint(point: unknown): KLatLng;
  };
};

export type KLatLngBounds = { extend(latLng: KLatLng): void; isEmpty(): boolean };

export type KCustomOverlay = {
  setMap(map: KMap | null): void;
  setPosition(latLng: KLatLng): void;
  setZIndex(z: number): void;
};

export type KPolyline = {
  setMap(map: KMap | null): void;
  setPath(path: KLatLng[]): void;
  setOptions(opts: Record<string, unknown>): void;
  setZIndex?(z: number): void;
};

export type KMaps = {
  Map: new (el: HTMLElement, opts: { center: KLatLng; level: number }) => KMap;
  LatLng: new (lat: number, lng: number) => KLatLng;
  LatLngBounds: new () => KLatLngBounds;
  Point: new (x: number, y: number) => { x: number; y: number };
  CustomOverlay: new (opts: {
    position: KLatLng;
    content: HTMLElement | string;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
    clickable?: boolean;
  }) => KCustomOverlay;
  Polyline: new (opts: {
    path: KLatLng[];
    strokeWeight?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeStyle?: string;
    zIndex?: number;
    endArrow?: boolean;
  }) => KPolyline;
  event: {
    addListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
    removeListener(target: unknown, type: string, handler: (...args: unknown[]) => void): void;
  };
};

export async function loadKakaoMaps(): Promise<KMaps> {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;
  if (!appKey) throw new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY가 설정되지 않았어요.");
  const kakao = await loadKakaoMapScript(appKey);
  return kakao.maps as unknown as KMaps;
}
