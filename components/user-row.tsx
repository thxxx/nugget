import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FollowUser } from "@/lib/types/domain";

type UserRowProps = {
  user: FollowUser;
  onFollowToggle?: (user: FollowUser) => void;
};

export function UserRow({ user, onFollowToggle }: UserRowProps) {
  const initials = user.nickname.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] border border-black/5 bg-white/92 p-3 shadow-[0_8px_20px_rgba(17,17,17,0.04)]">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--nugget-text)]">{user.nickname}</p>
          <div className="mt-1 flex items-center gap-1">
            {user.isFollowing ? <Badge variant="secondary">팔로잉</Badge> : null}
            {user.isFollower ? <Badge variant="outline">팔로워</Badge> : null}
            {typeof user.saveCount === "number" ? (
              <Badge variant="outline">저장 {user.saveCount}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      {onFollowToggle ? (
        <Button
          variant={user.isFollowing ? "secondary" : "default"}
          size="sm"
          onClick={() => onFollowToggle(user)}
        >
          {user.isFollowing ? "언팔로우" : "팔로우"}
        </Button>
      ) : null}
    </div>
  );
}
