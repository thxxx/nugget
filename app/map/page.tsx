"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coffee,
  LayoutGrid,
  LocateFixed,
  Star,
  UtensilsCrossed,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { PlaceBottomSheet } from "@/components/place-bottom-sheet";
import { TopSearchBar } from "@/components/top-search-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicKakaoMapsEnv } from "@/lib/env/public";
import { loadKakaoMapScript } from "@/lib/kakao/load-script";
import type {
  FollowUser,
  MapFeedPlace,
  SearchPlaceItem,
} from "@/lib/types/domain";
import { hashToColor } from "@/lib/utils";
import { useMapFollowVisibilityStore } from "@/store/useMapFollowVisibilityStore";
import { useMapStore } from "@/store/useMapStore";
import { useSessionStore } from "@/store/useSessionStore";

const DEFAULT_CENTER = {
  latitude: 37.5665,
  longitude: 126.978,
};

type MarkerRef = {
  marker: {
    setMap: (map: null) => void;
  };
  listener: unknown;
};

type FollowFilter = {
  userId: string;
  nickname: string;
  enabled: boolean;
};

type SearchTypeFilter = "all" | "restaurant" | "cafe";

type KakaoImageConstructors = {
  MarkerImage: new (
    src: string,
    size: unknown,
    options?: Record<string, unknown>,
  ) => unknown;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
};

const env = getPublicKakaoMapsEnv();

function formatFollowLabel(nickname: string, enabled: boolean) {
  return enabled ? `${nickname}` : `${nickname} (숨김)`;
}

function toSearchType(item: SearchPlaceItem): SearchTypeFilter {
  const category = item.category.trim();

  if (category.includes("카페") || category.includes("커피")) {
    return "cafe";
  }

  if (category.includes("음식점") || category.includes("식당")) {
    return "restaurant";
  }

  return "all";
}

function toSearchCoordinates(item: SearchPlaceItem) {
  if (typeof item.latitude === "number" && typeof item.longitude === "number") {
    return {
      latitude: item.latitude,
      longitude: item.longitude,
    };
  }

  const latitude = Number(item.rawMapy);
  const longitude = Number(item.rawMapx);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function createMarkerImage(
  maps: KakaoImageConstructors,
  color: string,
  symbol: string,
) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2" />
      <text x="12" y="15" text-anchor="middle" font-size="10" fill="white" font-family="Arial">${symbol}</text>
    </svg>
  `;

  const src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  return new maps.MarkerImage(src, new maps.Size(24, 24), {
    offset: new maps.Point(12, 12),
  });
}

export default function MapPage() {
  const router = useRouter();

  const sessionUser = useSessionStore((state) => state.sessionUser);
  const hydrated = useSessionStore((state) => state.hydrated);

  const searchQuery = useMapStore((state) => state.searchQuery);
  const searchResults = useMapStore((state) => state.searchResults);
  const feedPlaces = useMapStore((state) => state.feedPlaces);
  const selectedPlace = useMapStore((state) => state.selectedPlace);
  const setSearchQuery = useMapStore((state) => state.setSearchQuery);
  const setSearchResults = useMapStore((state) => state.setSearchResults);
  const setFeedPlaces = useMapStore((state) => state.setFeedPlaces);
  const setSelectedPlace = useMapStore((state) => state.setSelectedPlace);

  const followVisibilityHydrated = useMapFollowVisibilityStore(
    (state) => state.hydrated,
  );
  const visibilityByUserId = useMapFollowVisibilityStore(
    (state) => state.visibilityByUserId,
  );
  const setUserVisibility = useMapFollowVisibilityStore(
    (state) => state.setUserVisibility,
  );
  const syncFollowingUsers = useMapFollowVisibilityStore(
    (state) => state.syncFollowingUsers,
  );

  const [isMapReady, setIsMapReady] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mapError, setMapError] = useState("");
  const [searchError, setSearchError] = useState("");

  const [memo, setMemo] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [rating, setRating] = useState<1 | 2 | 3>(3);
  const [searchTypeFilter, setSearchTypeFilter] =
    useState<SearchTypeFilter>("all");

  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isEditMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [reactingSaveId, setReactingSaveId] = useState<number | null>(null);
  const [isUnsaveConfirmOpen, setUnsaveConfirmOpen] = useState(false);
  const [isFollowPanelOpen, setFollowPanelOpen] = useState(false);

  const [followingFilters, setFollowingFilters] = useState<FollowFilter[]>([]);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markerRefs = useRef<MarkerRef[]>([]);
  const temporaryMarkerRef = useRef<{
    setMap: (map: null) => void;
  } | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!sessionUser) {
      router.replace("/");
    }
  }, [hydrated, router, sessionUser]);

  const clearMarkerRefs = useCallback(() => {
    for (const markerRef of markerRefs.current) {
      markerRef.marker.setMap(null);
      if (window.kakao?.maps?.event && markerRef.listener) {
        window.kakao.maps.event.removeListener(markerRef.listener);
      }
    }
    markerRefs.current = [];
  }, []);

  const clearTemporaryMarker = useCallback(() => {
    if (temporaryMarkerRef.current) {
      temporaryMarkerRef.current.setMap(null);
      temporaryMarkerRef.current = null;
    }
  }, []);

  const applySelectedPlace = useCallback(
    (place: MapFeedPlace) => {
      if (!sessionUser) {
        return;
      }

      const mine = place.owners.find(
        (owner) => owner.userId === sessionUser.id,
      );

      setSelectedPlace({
        externalPlaceKey: place.externalPlaceKey,
        title: place.name,
        category: place.category,
        address: place.jibunAddress ?? "",
        roadAddress: place.roadAddress ?? "",
        telephone: "",
        link: "",
        rawMapx: place.longitude,
        rawMapy: place.latitude,
        latitude: place.latitude,
        longitude: place.longitude,
        saveId: mine?.saveId ?? null,
        myMemo: mine?.memo ?? "",
        myVisitStatus: mine?.visitStatus ?? "planned",
        myIsPublic: mine?.isPublic ?? true,
        myRating: mine?.rating ?? 3,
        myTags: mine?.tags ?? [],
        owners: place.owners,
      });

      setSearchResults([]);
      setMemo(mine?.memo ?? "");
      setIsPublic(mine?.isPublic ?? true);
      setRating(mine?.rating ?? 3);
      setEditMode(false);
      setSheetOpen(true);
    },
    [sessionUser, setSearchResults, setSelectedPlace],
  );

  const paintFeedMarkers = useCallback(
    (places: MapFeedPlace[]) => {
      const map = mapRef.current;
      const maps = window.kakao?.maps;

      if (!map || !maps || !sessionUser) {
        return;
      }

      clearMarkerRefs();

      for (const place of places) {
        const myOwner = place.owners.find(
          (owner) => owner.userId === sessionUser.id,
        );
        const representativeOwner = place.owners[0];
        const isMine = Boolean(myOwner);

        const markerColor = isMine
          ? "#f97316"
          : hashToColor(representativeOwner?.userId ?? String(place.placeId));

        const symbol = isMine ? "•" : "";
        const image = createMarkerImage(maps, markerColor, symbol);

        const marker = new maps.Marker({
          map,
          position: new maps.LatLng(place.latitude, place.longitude),
          image,
        });

        const listener = maps.event.addListener(marker, "click", () => {
          clearTemporaryMarker();
          applySelectedPlace(place);
        });

        markerRefs.current.push({ marker, listener });
      }
    },
    [applySelectedPlace, clearMarkerRefs, clearTemporaryMarker, sessionUser],
  );

  const fetchFeed = useCallback(async () => {
    if (!sessionUser) {
      return [] as MapFeedPlace[];
    }

    const response = await fetch(`/api/map/feed?viewerId=${sessionUser.id}`, {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      message?: string;
      places?: MapFeedPlace[];
    };

    if (!response.ok) {
      throw new Error(payload.message ?? "지도 피드 로딩에 실패했습니다.");
    }

    const places = payload.places ?? [];
    setFeedPlaces(places);
    return places;
  }, [sessionUser, setFeedPlaces]);

  const fetchFollowingFilters = useCallback(async () => {
    if (!sessionUser) {
      return;
    }

    const response = await fetch(
      `/api/follows?viewerId=${sessionUser.id}&type=following`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const payload = (await response.json()) as {
      message?: string;
      users?: FollowUser[];
    };

    if (!response.ok) {
      throw new Error(payload.message ?? "팔로잉 목록을 불러오지 못했습니다.");
    }

    const followingUsers = payload.users ?? [];
    const userIds = followingUsers.map((user) => user.id);
    const currentVisibility =
      useMapFollowVisibilityStore.getState().visibilityByUserId;

    setFollowingFilters(
      followingUsers.map((user) => ({
        userId: user.id,
        nickname: user.nickname,
        enabled: currentVisibility[user.id] ?? true,
      })),
    );

    syncFollowingUsers(userIds);
  }, [sessionUser, syncFollowingUsers]);

  useEffect(() => {
    if (!followVisibilityHydrated) {
      return;
    }

    setFollowingFilters((previous) =>
      previous.map((item) => ({
        ...item,
        enabled: visibilityByUserId[item.userId] ?? true,
      })),
    );
  }, [followVisibilityHydrated, visibilityByUserId]);

  useEffect(() => {
    if (!sessionUser || !mapContainerRef.current) {
      return;
    }

    let cancelled = false;

    const initializeMap = async () => {
      try {
        const kakao = await loadKakaoMapScript(
          env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY,
        );
        const maps = kakao.maps;

        if (cancelled || !mapContainerRef.current || !maps) {
          return;
        }

        const map = new maps.Map(mapContainerRef.current, {
          center: new maps.LatLng(
            DEFAULT_CENTER.latitude,
            DEFAULT_CENTER.longitude,
          ),
          level: 3,
        });

        const zoomControl = new maps.ZoomControl();
        map.addControl(zoomControl, maps.ControlPosition.RIGHT);

        mapRef.current = map;

        void recenterToCurrentLocation(
          map as { panTo: (latLng: unknown) => void },
          maps as {
            LatLng: new (latitude: number, longitude: number) => unknown;
          },
          () => cancelled,
        );

        if (!cancelled) {
          setIsMapReady(true);
          setMapError("");
          await Promise.all([fetchFeed(), fetchFollowingFilters()]);
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(
            error instanceof Error
              ? error.message
              : "지도를 불러오지 못했습니다.",
          );
        }
      }
    };

    void initializeMap();

    return () => {
      cancelled = true;
      clearMarkerRefs();
      clearTemporaryMarker();
      mapRef.current = null;
    };
  }, [
    clearMarkerRefs,
    clearTemporaryMarker,
    fetchFeed,
    fetchFollowingFilters,
    sessionUser,
  ]);

  const filteredFeedPlaces = useMemo(() => {
    if (!sessionUser) {
      return [] as MapFeedPlace[];
    }

    if (!followingFilters.length) {
      return feedPlaces;
    }

    const followingEnabledMap = new Map(
      followingFilters.map((item) => [item.userId, item.enabled]),
    );

    return feedPlaces
      .map((place) => {
        const owners = place.owners.filter((owner) => {
          if (owner.userId === sessionUser.id) {
            return true;
          }

          const enabled = followingEnabledMap.get(owner.userId);
          return enabled !== false;
        });

        return {
          ...place,
          owners,
        };
      })
      .filter((place) => place.owners.length > 0);
  }, [feedPlaces, followingFilters, sessionUser]);

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    paintFeedMarkers(filteredFeedPlaces);
  }, [filteredFeedPlaces, isMapReady, paintFeedMarkers]);

  const selectableResults = useMemo(() => {
    return searchResults.map((item) => {
      const coords = toSearchCoordinates(item);

      return {
        ...item,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      };
    });
  }, [searchResults]);

  const filteredSearchResults = useMemo(() => {
    if (searchTypeFilter === "all") {
      return selectableResults;
    }

    return selectableResults.filter(
      (item) => toSearchType(item) === searchTypeFilter,
    );
  }, [searchTypeFilter, selectableResults]);

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 2) {
      setSearchError("검색어는 2자 이상 입력해 주세요.");
      return;
    }

    setIsSearching(true);
    setSearchError("");

    try {
      const response = await fetch("/api/places/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuery,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        items?: SearchPlaceItem[];
      };

      if (!response.ok) {
        setSearchError(payload.message ?? "검색에 실패했습니다.");
        return;
      }

      setSearchResults(payload.items ?? []);
    } catch {
      setSearchError("검색 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  const openPlaceFromSearch = (item: SearchPlaceItem) => {
    const map = mapRef.current as { panTo: (latLng: unknown) => void } | null;
    const maps = window.kakao?.maps;
    const coords = toSearchCoordinates(item);

    if (!map || !maps || !coords) {
      setSearchError("해당 장소 좌표를 사용할 수 없습니다.");
      return;
    }

    const target = new maps.LatLng(coords.latitude, coords.longitude);
    map.panTo(target);

    clearTemporaryMarker();
    temporaryMarkerRef.current = new maps.Marker({
      map,
      position: target,
      image: createMarkerImage(maps, "#111827", "•"),
    });

    const existing = feedPlaces.find(
      (place) => place.externalPlaceKey === item.externalPlaceKey,
    );
    const mySave = existing?.owners.find(
      (owner) => owner.userId === sessionUser?.id,
    );

    setSelectedPlace({
      externalPlaceKey: item.externalPlaceKey,
      title: item.title,
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      telephone: item.telephone,
      link: item.link,
      rawMapx: item.rawMapx,
      rawMapy: item.rawMapy,
      latitude: coords.latitude,
      longitude: coords.longitude,
      saveId: mySave?.saveId ?? null,
      myMemo: mySave?.memo ?? "",
      myVisitStatus: mySave?.visitStatus ?? "planned",
      myIsPublic: mySave?.isPublic ?? true,
      myRating: mySave?.rating ?? 3,
      myTags: mySave?.tags ?? [],
      owners: existing?.owners ?? [],
    });
    setSearchResults([]);
    setMemo(mySave?.memo ?? "");
    setIsPublic(mySave?.isPublic ?? true);
    setRating(mySave?.rating ?? 3);
    setEditMode(false);
    setSheetOpen(true);
  };

  const refreshFeedAndReselect = async (externalPlaceKey?: string) => {
    const latestPlaces = await fetchFeed();
    if (!externalPlaceKey) {
      return;
    }

    const target = latestPlaces.find(
      (place) => place.externalPlaceKey === externalPlaceKey,
    );
    if (!target || !sessionUser) {
      return;
    }

    const mySave = target.owners.find(
      (owner) => owner.userId === sessionUser.id,
    );

    setSelectedPlace({
      externalPlaceKey: target.externalPlaceKey,
      title: target.name,
      category: target.category,
      address: target.jibunAddress ?? "",
      roadAddress: target.roadAddress ?? "",
      telephone: "",
      link: "",
      rawMapx: target.longitude,
      rawMapy: target.latitude,
      latitude: target.latitude,
      longitude: target.longitude,
      saveId: mySave?.saveId ?? null,
      myMemo: mySave?.memo ?? "",
      myVisitStatus: mySave?.visitStatus ?? "planned",
      myIsPublic: mySave?.isPublic ?? true,
      myRating: mySave?.rating ?? 3,
      myTags: mySave?.tags ?? [],
      owners: target.owners,
    });
    setMemo(mySave?.memo ?? "");
    setIsPublic(mySave?.isPublic ?? true);
    setRating(mySave?.rating ?? 3);
  };

  const saveOrUpdate = async () => {
    if (!sessionUser || !selectedPlace) {
      return;
    }

    setIsSaving(true);
    try {
      const visitStatus = selectedPlace.myVisitStatus ?? "planned";
      const tags = selectedPlace.myTags ?? [];

      if (selectedPlace.saveId) {
        const response = await fetch(`/api/saves/${selectedPlace.saveId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: sessionUser.id,
            memo,
            visitStatus,
            tags,
            isPublic,
            rating,
          }),
        });

        const payload = (await response.json()) as {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "저장 정보 수정에 실패했습니다.");
        }
      } else {
        const response = await fetch("/api/saves", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: sessionUser.id,
            memo,
            visitStatus,
            tags,
            isPublic,
            rating,
            place: {
              externalPlaceKey: selectedPlace.externalPlaceKey,
              title: selectedPlace.title,
              category: selectedPlace.category,
              address: selectedPlace.address,
              roadAddress: selectedPlace.roadAddress,
              telephone: selectedPlace.telephone,
              link: selectedPlace.link,
              rawMapx: selectedPlace.rawMapx,
              rawMapy: selectedPlace.rawMapy,
              latitude: selectedPlace.latitude,
              longitude: selectedPlace.longitude,
            },
          }),
        });

        const payload = (await response.json()) as {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(payload.message ?? "장소 저장에 실패했습니다.");
        }
      }

      await refreshFeedAndReselect(selectedPlace.externalPlaceKey);
      setEditMode(false);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "저장 처리에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeSave = async () => {
    if (!sessionUser || !selectedPlace?.saveId) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/saves/${selectedPlace.saveId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: sessionUser.id,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "저장 취소에 실패했습니다.");
      }

      await fetchFeed();
      setSelectedPlace({
        ...selectedPlace,
        saveId: null,
        myMemo: "",
        myVisitStatus: "planned",
        myIsPublic: true,
        myRating: 3,
        myTags: [],
        owners: selectedPlace.owners.filter(
          (owner) => owner.userId !== sessionUser.id,
        ),
      });
      setMemo("");
      setIsPublic(true);
      setRating(3);
      setEditMode(false);
      setUnsaveConfirmOpen(false);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "저장 취소에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const reactToOwnerMemo = async (
    saveId: number,
    reaction: "like" | "dislike" | null,
  ) => {
    if (!sessionUser || !selectedPlace) {
      return;
    }

    setReactingSaveId(saveId);
    try {
      const response = await fetch(`/api/saves/${saveId}/reaction`, {
        method: reaction ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          reaction
            ? { viewerId: sessionUser.id, reaction }
            : { viewerId: sessionUser.id },
        ),
      });

      const payload = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "메모 반응 처리에 실패했습니다.");
      }

      await refreshFeedAndReselect(selectedPlace.externalPlaceKey);
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "메모 반응 처리에 실패했습니다.",
      );
    } finally {
      setReactingSaveId(null);
    }
  };

  const moveToCurrentLocation = async () => {
    const map = mapRef.current as { panTo: (latLng: unknown) => void } | null;
    const maps = window.kakao?.maps;

    if (!map || !maps) {
      setSearchError("지도가 아직 준비되지 않았습니다.");
      return;
    }

    setIsLocating(true);
    try {
      const center = await resolveInitialCenter();
      if (!center) {
        setSearchError(
          "현재 위치를 가져오지 못했습니다. 위치 권한을 확인해 주세요.",
        );
        return;
      }

      map.panTo(new maps.LatLng(center.latitude, center.longitude));
      setSearchError("");
    } finally {
      setIsLocating(false);
    }
  };

  if (!hydrated || !sessionUser) {
    return (
      <AppShell>
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-sm text-[var(--nugget-muted)]">세션 확인 중...</p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell className="overflow-hidden" disableBottomPadding>
      <main className="relative h-dvh">
        <div className="h-full w-full" ref={mapContainerRef} />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3">
          <div className="pointer-events-auto">
            <TopSearchBar
              query={searchQuery}
              loading={isSearching}
              onQueryChange={setSearchQuery}
              onSubmit={handleSearch}
              onClear={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            />

            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={searchTypeFilter === "all" ? "default" : "ghost"}
                  className="h-8 shrink-0 gap-1 px-5 text-xs"
                  onClick={() => setSearchTypeFilter("all")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  전체
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    searchTypeFilter === "restaurant" ? "default" : "ghost"
                  }
                  className="h-8 shrink-0 gap-1 px-5 text-xs"
                  onClick={() => setSearchTypeFilter("restaurant")}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  음식점
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={searchTypeFilter === "cafe" ? "default" : "ghost"}
                  className="h-8 shrink-0 gap-1 px-5 text-xs"
                  onClick={() => setSearchTypeFilter("cafe")}
                >
                  <Coffee className="h-3.5 w-3.5" />
                  카페
                </Button>
              </div>
              <Button
                type="button"
                size="icon"
                variant={isFollowPanelOpen ? "default" : "secondary"}
                className="h-10 w-10 shrink-0 rounded-full"
                onClick={() => setFollowPanelOpen((prev) => !prev)}
                aria-label="팔로잉 필터 열기"
              >
                <Star className="h-4 w-4" />
              </Button>
            </div>

            {isFollowPanelOpen ? (
              <section className="mt-2 overflow-x-auto rounded-[24px] border border-black/5 bg-white/90 p-2 shadow-[0_12px_30px_rgba(17,17,17,0.06)] backdrop-blur">
                <div className="mb-2 text-xs font-medium text-[var(--nugget-muted)]">
                  팔로우 사용자 표시 토글
                </div>
                {followingFilters.length ? (
                  <div className="flex gap-2">
                    {followingFilters.map((filter) => (
                      <Button
                        key={filter.userId}
                        type="button"
                        size="sm"
                        variant={filter.enabled ? "default" : "secondary"}
                        className="shrink-0"
                        onClick={() => {
                          const nextEnabled = !filter.enabled;
                          setUserVisibility(filter.userId, nextEnabled);
                          setFollowingFilters((previous) =>
                            previous.map((item) =>
                              item.userId === filter.userId
                                ? { ...item, enabled: nextEnabled }
                                : item,
                            ),
                          );
                        }}
                      >
                        {formatFollowLabel(filter.nickname, filter.enabled)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[var(--nugget-muted)]">
                    아직 팔로우한 사용자가 없습니다.
                  </p>
                )}
              </section>
            ) : null}

            {searchError ? (
              <div className="mt-2 rounded-[16px] border border-red-200 bg-red-50/95 px-3 py-2 text-xs text-red-600">
                {searchError}
              </div>
            ) : null}

            {filteredSearchResults.length ? (
              <section className="mt-2 max-h-[360px] overflow-auto rounded-[24px] border border-black/5 bg-white/90 p-2 shadow-[0_12px_30px_rgba(17,17,17,0.06)] backdrop-blur">
                <ul className="space-y-2">
                  {filteredSearchResults.map((item) => {
                    const hasCoordinates =
                      typeof item.latitude === "number" &&
                      typeof item.longitude === "number";

                    return (
                      <li
                        key={item.externalPlaceKey}
                        className="border-b border-black/5 bg-white/95 p-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--nugget-text)]">
                              {item.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-[var(--nugget-muted)]">
                              {item.roadAddress || item.address}
                            </p>
                          </div>
                          {feedPlaces.some(
                            (place) =>
                              place.externalPlaceKey === item.externalPlaceKey,
                          ) ? (
                            <Badge variant="secondary">저장됨</Badge>
                          ) : null}
                        </div>
                        <Button
                          className="mt-2 w-full"
                          variant="secondary"
                          size="sm"
                          disabled={!hasCoordinates}
                          onClick={() => openPlaceFromSearch(item)}
                        >
                          {hasCoordinates ? "지도에서 보기" : "좌표 변환 불가"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {!isMapReady && !mapError ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <p className="rounded-xl bg-[var(--nugget-surface)] px-3 py-2 text-sm text-[var(--nugget-muted)]">
              지도 불러오는 중...
            </p>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute inset-x-3 top-20 z-20">
            <EmptyState
              title="지도를 불러오지 못했습니다"
              description={mapError}
            />
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-[calc(var(--nugget-bottom-nav-offset)+12px)] right-3 z-20">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="pointer-events-auto h-11 w-11 rounded-full border border-black/8 bg-white/95 shadow-[0_10px_24px_rgba(17,17,17,0.14)]"
            onClick={() => {
              void moveToCurrentLocation();
            }}
            disabled={!isMapReady || isLocating}
            aria-label="내 위치로 이동"
          >
            <LocateFixed
              className={isLocating ? "h-4 w-4 animate-pulse" : "h-4 w-4"}
            />
          </Button>
        </div>

        <PlaceBottomSheet
          open={isSheetOpen}
          place={selectedPlace}
          memo={memo}
          isPublic={isPublic}
          rating={rating}
          isEditing={isEditMode}
          viewerUserId={sessionUser.id}
          isSaving={isSaving}
          reactingSaveId={reactingSaveId}
          onMemoChange={setMemo}
          onVisibilityChange={setIsPublic}
          onRatingChange={setRating}
          onStartEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          onOwnerReaction={(saveId, reaction) => {
            void reactToOwnerMemo(saveId, reaction);
          }}
          onSave={saveOrUpdate}
          onRemove={() => setUnsaveConfirmOpen(true)}
          onClose={() => {
            setSheetOpen(false);
            setEditMode(false);
          }}
        />

        <ConfirmDialog
          open={isUnsaveConfirmOpen}
          onOpenChange={setUnsaveConfirmOpen}
          title="저장을 취소할까요?"
          description="이 장소가 내 저장 목록에서 삭제됩니다."
          confirmLabel="저장 취소"
          confirmVariant="destructive"
          onConfirm={() => {
            void removeSave();
          }}
        />
      </main>
    </AppShell>
  );
}

function resolveInitialCenter() {
  return new Promise<{ latitude: number; longitude: number } | null>(
    (resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 60000,
        },
      );
    },
  );
}

async function recenterToCurrentLocation(
  map: { panTo: (latLng: unknown) => void },
  maps: { LatLng: new (latitude: number, longitude: number) => unknown },
  isCancelled: () => boolean,
) {
  const center = await resolveInitialCenter();
  if (!center || isCancelled()) {
    return;
  }

  map.panTo(new maps.LatLng(center.latitude, center.longitude));
}
