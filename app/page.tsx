"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/store/useSessionStore";

async function loginOrSignup(nickname: string, signupOnMissing: boolean) {
  const response = await fetch("/api/session/login-or-signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nickname,
      signupOnMissing,
    }),
  });

  const payload = (await response.json()) as {
    code?: string;
    message?: string;
    user?: {
      id: string;
      nickname: string;
    };
  };

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export default function LoginPage() {
  const router = useRouter();

  const sessionUser = useSessionStore((state) => state.sessionUser);
  const hydrated = useSessionStore((state) => state.hydrated);
  const login = useSessionStore((state) => state.login);

  const [nickname, setNickname] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignupConfirmOpen, setSignupConfirmOpen] = useState(false);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (sessionUser) {
      router.replace("/map");
    }
  }, [hydrated, router, sessionUser]);

  const submit = async (signupOnMissing: boolean) => {
    if (isSubmitting) {
      return;
    }

    const trimmedNickname = nickname.trim();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await loginOrSignup(trimmedNickname, signupOnMissing);

      if (!result.ok) {
        if (result.status === 404 && result.payload.code === "NOT_FOUND") {
          setSignupConfirmOpen(true);
          return;
        }

        setErrorMessage(
          result.payload.message ?? "로그인 요청에 실패했습니다.",
        );
        return;
      }

      if (!result.payload.user) {
        setErrorMessage("로그인 응답이 올바르지 않습니다.");
        return;
      }

      login(result.payload.user);
      router.replace("/map");
    } catch {
      setErrorMessage("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hydrated) {
    return (
      <AppShell hideBottomNav>
        <main className="flex min-h-dvh items-center justify-center px-6">
          <p className="text-sm text-[var(--nugget-muted)]">
            세션 불러오는 중...
          </p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell hideBottomNav>
      <main className="flex min-h-dvh flex-col justify-center px-6">
        <section className="rounded-3xl border border-[var(--nugget-border)] bg-[var(--nugget-surface)] p-6 shadow-xl">
          <p className="text-sm font-medium text-[var(--nugget-muted)]">
            지인 기반 맛집 아카이브
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--nugget-text)]">
            nugget
          </h1>
          <p className="mt-2 text-sm text-[var(--nugget-muted)]">
            친구와 서로 팔로우해서 저장한 장소를 공유하세요.
          </p>

          <div className="mt-6 space-y-3">
            <Input
              value={nickname}
              placeholder="닉네임 입력 (2~20자)"
              maxLength={20}
              onChange={(event) => setNickname(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit(false);
                }
              }}
            />
            {errorMessage ? (
              <p className="text-xs text-red-600">{errorMessage}</p>
            ) : null}
            <Button
              className="w-full"
              onClick={() => {
                submit(false);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "확인 중..." : "시작하기"}
            </Button>
          </div>
        </section>

        <ConfirmDialog
          open={isSignupConfirmOpen}
          onOpenChange={setSignupConfirmOpen}
          title="없는 닉네임입니다."
          description="가입하시겠습니까?"
          confirmLabel="가입하고 시작"
          cancelLabel="취소"
          onConfirm={async () => {
            setSignupConfirmOpen(false);
            await submit(true);
          }}
        />
      </main>
    </AppShell>
  );
}
