"use client";

import { ArrowLeft, Lock, MapPin, Pencil, Star, ThumbsDown, ThumbsUp, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { VisitStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils";
import type { SelectedPlace } from "@/store/useMapStore";

type PlaceBottomSheetProps = {
  open: boolean;
  place: SelectedPlace | null;
  memo: string;
  isPublic: boolean;
  rating: 1 | 2 | 3;
  isEditing: boolean;
  viewerUserId: string;
  isSaving?: boolean;
  reactingSaveId?: number | null;
  onMemoChange: (memo: string) => void;
  onVisibilityChange: (value: boolean) => void;
  onRatingChange: (value: 1 | 2 | 3) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onOwnerReaction: (saveId: number, reaction: "like" | "dislike" | null) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
};

function formatOwnerVisitStatus(visitStatus: VisitStatus) {
  return visitStatus === "visited" ? "방문 완료" : "방문 예정";
}

export function PlaceBottomSheet({
  open,
  place,
  memo,
  isPublic,
  rating,
  isEditing,
  viewerUserId,
  isSaving = false,
  reactingSaveId = null,
  onMemoChange,
  onVisibilityChange,
  onRatingChange,
  onStartEdit,
  onCancelEdit,
  onOwnerReaction,
  onSave,
  onRemove,
  onClose,
}: PlaceBottomSheetProps) {
  const saveActionLabel = place?.saveId ? "수정하기" : "저장하기";

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-[var(--nugget-bottom-nav-offset)] left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-3 transition-transform duration-300",
        open ? "translate-y-0" : "translate-y-[110%]",
      )}
    >
      <section
        className={cn(
          "relative pointer-events-auto overflow-y-auto rounded-t-[28px] border border-black/5 bg-white/96 p-4 shadow-[0_-12px_36px_rgba(17,17,17,0.12)] backdrop-blur",
          isEditing ? "max-h-[44dvh]" : "max-h-[38dvh]",
        )}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs text-[var(--nugget-muted)]">
              <MapPin className="h-3.5 w-3.5" />
              선택한 장소
            </p>
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-[var(--nugget-text)]">
              {place?.title ?? "장소 없음"}
            </h3>
            <p className="truncate text-xs text-[var(--nugget-muted)]">
              {place?.roadAddress || place?.address || "주소 정보 없음"}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-black/5 bg-white p-2 text-[var(--nugget-muted)] hover:bg-black/[0.04]"
            onClick={onClose}
            aria-label="시트 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isEditing ? (
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full"
              onClick={onStartEdit}
              disabled={!place}
            >
              {saveActionLabel}
            </Button>
            {place?.owners.length ? (
              <div className="space-y-2 rounded-[20px] bg-[var(--nugget-surface-muted)] p-3">
                <p className="text-xs font-medium text-[var(--nugget-muted)]">
                  이 장소를 저장한 사람
                </p>
                <ul className="space-y-1.5">
                  {place.owners.map((owner) => {
                    const isMine = owner.userId === viewerUserId;
                    const likeSelected = owner.viewerReaction === "like";
                    const dislikeSelected = owner.viewerReaction === "dislike";
                    const canReact = owner.memo !== null && !isMine;

                    return (
                      <li
                        key={owner.saveId}
                        className="rounded-[14px] bg-[var(--nugget-surface)] px-2 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--nugget-text)]">
                            {owner.nickname}
                          </p>
                          <Badge variant="outline">
                            {formatOwnerVisitStatus(owner.visitStatus)}
                          </Badge>
                          <Badge variant="secondary">
                            {"★".repeat(owner.rating)}
                          </Badge>
                        </div>
                        {owner.tags.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {owner.tags.map((tag) => (
                              <Badge
                                key={`${owner.saveId}-${tag}`}
                                variant="secondary"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-1 text-[var(--nugget-muted)]">
                          {owner.memo ?? "메모는 팔로우 후 볼 수 있어요"}
                        </p>
                        {canReact ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={likeSelected ? "default" : "secondary"}
                              className="h-7 gap-1 px-2 text-[11px]"
                              disabled={reactingSaveId === owner.saveId}
                              onClick={() => onOwnerReaction(owner.saveId, likeSelected ? null : "like")}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              {owner.likeCount}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={dislikeSelected ? "default" : "secondary"}
                              className="h-7 gap-1 px-2 text-[11px]"
                              disabled={reactingSaveId === owner.saveId}
                              onClick={() =>
                                onOwnerReaction(owner.saveId, dislikeSelected ? null : "dislike")
                              }
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              {owner.dislikeCount}
                            </Button>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="rounded-[20px] bg-[var(--nugget-surface-muted)] p-3 text-xs text-[var(--nugget-muted)]">
                아직 이 장소를 저장한 사람이 없습니다.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={onCancelEdit}
              >
                <ArrowLeft className="h-4 w-4" />
                목록으로
              </Button>
              <p className="flex items-center gap-1 text-xs text-[var(--nugget-muted)]">
                <Pencil className="h-3.5 w-3.5" />
                저장 정보 편집
              </p>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium text-[var(--nugget-text)]">
                <Lock className="h-3.5 w-3.5" />
                공개 설정
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isPublic ? "default" : "secondary"}
                  className="flex-1"
                  onClick={() => onVisibilityChange(true)}
                >
                  공개하기
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!isPublic ? "default" : "secondary"}
                  className="flex-1"
                  onClick={() => onVisibilityChange(false)}
                >
                  비공개
                </Button>
              </div>
              <p className="text-xs text-[var(--nugget-muted)]">
                비공개를 선택하면 내 지도에서만 보이고, 나를 팔로우한 사람에게는
                숨겨집니다.
              </p>
            </div>

            <div className="mt-3 space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium text-[var(--nugget-text)]">
                <Star className="h-3.5 w-3.5" />내 별점
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map((score) => (
                  <Button
                    key={score}
                    type="button"
                    size="sm"
                    variant={rating === score ? "default" : "secondary"}
                    className="flex-1"
                    onClick={() => onRatingChange(score as 1 | 2 | 3)}
                  >
                    {"★".repeat(score)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--nugget-text)]">
                  내 메모
                </p>
                <p className="text-xs text-[var(--nugget-muted)]">
                  {memo.length}/500
                </p>
              </div>
              <Textarea
                value={memo}
                maxLength={500}
                placeholder="이 장소에 대한 메모를 남겨보세요"
                onChange={(event) => onMemoChange(event.target.value)}
              />
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                onClick={onSave}
                disabled={!place || isSaving}
              >
                {place?.saveId ? "저장 정보 수정" : "저장하기"}
              </Button>
              {place?.saveId ? (
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={onRemove}
                  disabled={isSaving}
                >
                  저장 취소
                </Button>
              ) : null}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
