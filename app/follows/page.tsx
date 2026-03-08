"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { UserRow } from "@/components/user-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FollowUser } from "@/lib/types/domain";
import { useFollowStore } from "@/store/useFollowStore";
import { useSessionStore } from "@/store/useSessionStore";

export default function FollowsPage() {
  const router = useRouter();

  const sessionUser = useSessionStore((state) => state.sessionUser);
  const hydrated = useSessionStore((state) => state.hydrated);

  const following = useFollowStore((state) => state.following);
  const followers = useFollowStore((state) => state.followers);
  const searchResults = useFollowStore((state) => state.searchResults);
  const setFollowing = useFollowStore((state) => state.setFollowing);
  const setFollowers = useFollowStore((state) => state.setFollowers);
  const setSearchResults = useFollowStore((state) => state.setSearchResults);

  const [activeTab, setActiveTab] = useState("following");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [targetUser, setTargetUser] = useState<FollowUser | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!sessionUser) {
      router.replace("/");
    }
  }, [hydrated, router, sessionUser]);

  const loadFollowList = useCallback(
    async (type: "following" | "followers") => {
      if (!sessionUser) {
        return;
      }

      const response = await fetch(
        `/api/follows?viewerId=${sessionUser.id}&type=${type}`,
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
        throw new Error(
          payload.message ?? "팔로우 목록을 불러오지 못했습니다.",
        );
      }

      if (type === "following") {
        setFollowing(payload.users ?? []);
        return;
      }

      setFollowers(payload.users ?? []);
    },
    [sessionUser, setFollowers, setFollowing],
  );

  const refreshAllLists = useCallback(async () => {
    await Promise.all([
      loadFollowList("following"),
      loadFollowList("followers"),
    ]);
  }, [loadFollowList]);

  useEffect(() => {
    if (!sessionUser) {
      return;
    }

    void refreshAllLists();
  }, [refreshAllLists, sessionUser]);

  const fetchUserSearch = useCallback(async (query: string) => {
    if (!sessionUser) {
      return;
    }

    setIsLoading(true);
    setSearchError("");

    try {
      const trimmedQuery = query.trim();
      const endpoint = new URLSearchParams({
        viewerId: sessionUser.id,
      });

      if (trimmedQuery) {
        endpoint.set("q", trimmedQuery);
      }

      const response = await fetch(
        `/api/users/search?${endpoint.toString()}`,
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
        setSearchError(payload.message ?? "유저 검색에 실패했습니다.");
        return;
      }

      setSearchResults(payload.users ?? []);
    } catch {
      setSearchError("유저 검색 중 네트워크 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionUser, setSearchResults]);

  const handleSearchSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await fetchUserSearch(searchQuery);
  };

  useEffect(() => {
    if (!sessionUser || activeTab !== "search") {
      return;
    }

    if (searchQuery.trim()) {
      return;
    }

    void fetchUserSearch("");
  }, [activeTab, fetchUserSearch, searchQuery, sessionUser]);

  const applyFollowAction = async (user: FollowUser, shouldFollow: boolean) => {
    if (!sessionUser) {
      return;
    }

    const endpoint = "/api/follows";
    const method = shouldFollow ? "POST" : "DELETE";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        followerUserId: sessionUser.id,
        followingUserId: user.id,
      }),
    });

    const payload = (await response.json()) as {
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message ?? "팔로우 상태 변경에 실패했습니다.");
    }

    await refreshAllLists();

    if (activeTab === "search") {
      await fetchUserSearch(searchQuery);
    }
  };

  const safeFollowAction = async (user: FollowUser, shouldFollow: boolean) => {
    try {
      await applyFollowAction(user, shouldFollow);
      setSearchError("");
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "팔로우 상태 변경에 실패했습니다.",
      );
    }
  };

  const stats = useMemo(
    () => ({
      following: following.length,
      followers: followers.length,
    }),
    [following.length, followers.length],
  );

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
          <p className="text-xs font-medium text-[var(--nugget-muted)]">
            @{sessionUser.nickname}
          </p>
          <h1 className="mt-1 text-xl font-bold text-[var(--nugget-text)]">
            Follows
          </h1>
          <p className="mt-2 text-sm text-[var(--nugget-muted)]">
            팔로잉 {stats.following} · 팔로워 {stats.followers}
          </p>
        </header>

        <section className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="following">
                내가 팔로우
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="followers">
                나를 팔로우
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="search">
                유저 검색
              </TabsTrigger>
            </TabsList>

            <TabsContent value="following">
              <div className="mt-3 space-y-2">
                {following.length ? (
                  following.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onFollowToggle={() => {
                        setTargetUser(user);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="아직 팔로우한 사용자가 없어요"
                    description="검색 탭에서 닉네임으로 찾아 팔로우해 보세요."
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="followers">
              <div className="mt-3 space-y-2">
                {followers.length ? (
                  followers.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onFollowToggle={async (clickedUser) => {
                        if (clickedUser.isFollowing) {
                          setTargetUser(clickedUser);
                          return;
                        }

                        await safeFollowAction(clickedUser, true);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="아직 팔로워가 없어요"
                    description="지도를 공유하면 팔로워가 생길 가능성이 높아져요."
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="search">
              <form
                className="mt-3 flex gap-2 items-center relative"
                onSubmit={handleSearchSubmit}
              >
                <Input
                  value={searchQuery}
                  placeholder="닉네임 검색"
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <Button
                  className="w-16 h-9 rounded-xl absolute right-1"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? "검색중" : "검색"}
                </Button>
              </form>
              {searchError ? (
                <p className="mt-2 text-xs text-red-600">{searchError}</p>
              ) : null}

              <div className="mt-3 space-y-2">
                {searchResults.length ? (
                  searchResults.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onFollowToggle={async (clickedUser) => {
                        if (clickedUser.isFollowing) {
                          setTargetUser(clickedUser);
                          return;
                        }

                        await safeFollowAction(clickedUser, true);
                      }}
                    />
                  ))
                ) : searchQuery.trim() ? (
                  <EmptyState
                    title="검색 결과가 없습니다"
                    description="다른 닉네임으로 다시 검색해 보세요."
                  />
                ) : (
                  <EmptyState
                    title="추천 유저가 없습니다"
                    description="아직 공개 저장이 충분하지 않아요."
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <ConfirmDialog
          open={Boolean(targetUser)}
          onOpenChange={(open) => {
            if (!open) {
              setTargetUser(null);
            }
          }}
          title="정말 언팔로우할까요?"
          description={
            targetUser
              ? `${targetUser.nickname}님의 저장 장소가 지도에서 사라집니다.`
              : ""
          }
          confirmLabel="언팔로우"
          confirmVariant="destructive"
          onConfirm={async () => {
            if (!targetUser) {
              return;
            }

            await safeFollowAction(targetUser, false);
            setTargetUser(null);
          }}
        />
      </main>
    </AppShell>
  );
}
