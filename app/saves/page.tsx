"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SaveLikeActivityItem, SaveListItem } from "@/lib/types/domain";
import { useSessionStore } from "@/store/useSessionStore";

type ProfileTab = "saved" | "activity";

function formatSavedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export default function SavesPage() {
  const router = useRouter();

  const sessionUser = useSessionStore((state) => state.sessionUser);
  const hydrated = useSessionStore((state) => state.hydrated);
  const logout = useSessionStore((state) => state.logout);

  const [activeTab, setActiveTab] = useState<ProfileTab>("saved");
  const [items, setItems] = useState<SaveListItem[]>([]);
  const [activities, setActivities] = useState<SaveLikeActivityItem[]>([]);
  const [isSavesLoading, setIsSavesLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!sessionUser) {
      router.replace("/");
    }
  }, [hydrated, router, sessionUser]);

  const fetchSaves = useCallback(async () => {
    if (!sessionUser) {
      return;
    }

    setIsSavesLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/saves/list?userId=${sessionUser.id}&sort=latest`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as {
        message?: string;
        items?: SaveListItem[];
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "저장 목록을 불러오지 못했습니다.");
        return;
      }

      setItems(payload.items ?? []);
    } catch {
      setErrorMessage("저장 목록 조회 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsSavesLoading(false);
    }
  }, [sessionUser]);

  const fetchActivities = useCallback(async () => {
    if (!sessionUser) {
      return;
    }

    setIsActivitiesLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/saves/activity?userId=${sessionUser.id}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        message?: string;
        items?: SaveLikeActivityItem[];
      };

      if (!response.ok) {
        setErrorMessage(payload.message ?? "활동 기록을 불러오지 못했습니다.");
        return;
      }

      setActivities(payload.items ?? []);
    } catch {
      setErrorMessage("활동 기록 조회 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsActivitiesLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    void fetchSaves();
  }, [fetchSaves]);

  useEffect(() => {
    if (activeTab !== "activity") {
      return;
    }

    void fetchActivities();
  }, [activeTab, fetchActivities]);

  if (!hydrated || !sessionUser) {
    return (
      <AppShell>
        <main className="flex min-h-dvh items-center justify-center">
          <p className="text-sm text-[var(--nugget-muted)]">세션 확인 중...</p>
        </main>
      </AppShell>
    );
  }

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <AppShell>
      <main className="min-h-dvh px-4 pt-4">
        <header className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--nugget-muted)]">@{sessionUser.nickname}</p>
              <h1 className="mt-1 text-xl font-bold text-[var(--nugget-text)]">내 저장목록</h1>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-3"
              onClick={handleLogout}
            >
              로그아웃
            </Button>
          </div>
          <p className="mt-2 text-sm text-[var(--nugget-muted)]">
            {activeTab === "saved"
              ? `총 ${items.length}개 장소`
              : `좋아요 기록 ${activities.length}개`}
          </p>
        </header>

        <section className="mt-4 space-y-3">
          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMessage}
            </div>
          ) : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProfileTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="saved" className="flex-1">
                저장목록
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-1">
                기록
              </TabsTrigger>
            </TabsList>

            <TabsContent value="saved">
              {isSavesLoading ? (
                <div className="rounded-[24px] border border-black/5 bg-white/92 p-4 text-sm text-[var(--nugget-muted)] shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
                  저장 목록 불러오는 중...
                </div>
              ) : items.length ? (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.saveId} className="rounded-[24px] border border-black/5 bg-white/92 p-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--nugget-text)]">
                            {item.place.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--nugget-muted)]">
                            {item.place.roadAddress || item.place.jibunAddress || "주소 정보 없음"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant="secondary">{"★".repeat(item.rating)}</Badge>
                          <p className="text-[11px] text-[var(--nugget-muted)]">
                            {formatSavedDate(item.createdAt)}
                          </p>
                        </div>
                      </div>

                      {item.tags.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <Badge key={`${item.saveId}-${tag}`} variant="secondary">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <p className="mt-2 line-clamp-3 text-xs text-[var(--nugget-muted)]">
                        {item.memo || "메모 없음"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="저장한 장소가 없어요"
                  description="지도 탭에서 장소를 검색하고 저장해 보세요."
                />
              )}
            </TabsContent>

            <TabsContent value="activity">
              {isActivitiesLoading ? (
                <div className="rounded-[24px] border border-black/5 bg-white/92 p-4 text-sm text-[var(--nugget-muted)] shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
                  활동 기록 불러오는 중...
                </div>
              ) : activities.length ? (
                <ul className="space-y-2">
                  {activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-[24px] border border-black/5 bg-white/92 p-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--nugget-text)]">
                            {activity.reactorNickname}님이 좋아요
                          </p>
                          <p className="mt-1 truncate text-xs text-[var(--nugget-muted)]">
                            {activity.placeName}
                          </p>
                        </div>
                        <p className="shrink-0 text-[11px] text-[var(--nugget-muted)]">
                          {formatSavedDate(activity.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="좋아요 기록이 없어요"
                  description="다른 사용자가 내 저장 장소에 좋아요를 누르면 여기에 표시됩니다."
                />
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </AppShell>
  );
}
