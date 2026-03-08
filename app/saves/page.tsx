"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SaveListItem, VisitStatus } from "@/lib/types/domain";
import { useSessionStore } from "@/store/useSessionStore";

type SortKey = "latest" | "name";

function formatVisitStatus(status: VisitStatus) {
  return status === "visited" ? "방문 완료" : "방문 예정";
}

export default function SavesPage() {
  const router = useRouter();

  const sessionUser = useSessionStore((state) => state.sessionUser);
  const hydrated = useSessionStore((state) => state.hydrated);

  const [sort, setSort] = useState<SortKey>("latest");
  const [items, setItems] = useState<SaveListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/saves/list?userId=${sessionUser.id}&sort=${sort}`,
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
      setIsLoading(false);
    }
  }, [sessionUser, sort]);

  useEffect(() => {
    void fetchSaves();
  }, [fetchSaves]);

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
    <AppShell>
      <main className="min-h-dvh px-4 pt-4">
        <header className="rounded-[28px] border border-black/5 bg-white/90 p-5 shadow-[0_12px_35px_rgba(17,17,17,0.05)] backdrop-blur">
          <p className="text-xs font-medium text-[var(--nugget-muted)]">@{sessionUser.nickname}</p>
          <h1 className="mt-1 text-xl font-bold text-[var(--nugget-text)]">내 저장목록</h1>
          <p className="mt-2 text-sm text-[var(--nugget-muted)]">총 {items.length}개 장소</p>
        </header>

        <section className="mt-4 space-y-3">
          <div className="rounded-[24px] border border-black/5 bg-white/92 p-3 shadow-[0_10px_26px_rgba(17,17,17,0.04)]">
            <p className="mb-2 text-xs font-medium text-[var(--nugget-muted)]">정렬</p>
            <Tabs value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <TabsList className="w-full">
                <TabsTrigger value="latest" className="flex-1">
                  최신순
                </TabsTrigger>
                <TabsTrigger value="name" className="flex-1">
                  이름순
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
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
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="outline">{formatVisitStatus(item.visitStatus)}</Badge>
                      <Badge variant="secondary">{"★".repeat(item.rating)}</Badge>
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
        </section>
      </main>
    </AppShell>
  );
}
