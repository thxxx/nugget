interface KakaoMapsNamespace {
  load: (callback: () => void) => void;
  Map: new (container: HTMLElement, options: Record<string, unknown>) => {
    panTo: (latLng: unknown) => void;
    addControl: (control: unknown, position: unknown) => void;
  };
  LatLng: new (lat: number, lng: number) => unknown;
  Marker: new (options: Record<string, unknown>) => {
    setMap: (map: null) => void;
  };
  MarkerImage: new (src: string, size: unknown, options?: Record<string, unknown>) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  ZoomControl: new () => unknown;
  ControlPosition: {
    RIGHT: unknown;
  };
  event: {
    addListener: (target: unknown, eventName: string, handler: () => void) => unknown;
    removeListener: (listener: unknown) => void;
  };
}

declare global {
  interface Window {
    kakao?: {
      maps?: KakaoMapsNamespace;
    };
  }
}

export {};
