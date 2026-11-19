"use client";

import {
  BedDouble,
  Camera,
  Coffee,
  Heart,
  MapPin,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { CATEGORY_META } from "@/lib/jeju/category";
import type { PlaceCategory } from "@/lib/jeju/types";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: Record<PlaceCategory, LucideIcon> = {
  food: Utensils,
  cafe: Coffee,
  sight: Camera,
  stay: BedDouble,
  etc: MapPin,
};

export function CategoryTile({
  category,
  size = 44,
  className,
}: {
  category: PlaceCategory;
  size?: number;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category];
  const meta = CATEGORY_META[category];
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-[12px]", className)}
      style={{ width: size, height: size, background: meta.tint, color: meta.color }}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={2} />
    </span>
  );
}

export function HeartButton({
  saved,
  onToggle,
  size = 36,
  className,
}: {
  saved: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={saved ? "담기 취소" : "담기"}
      aria-pressed={saved}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full transition hover:bg-surface-strong active:scale-90",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Heart
        size={Math.round(size * 0.52)}
        strokeWidth={2}
        className={cn("transition", saved ? "fill-rausch text-rausch" : "text-ink")}
      />
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  className,
  active,
}: {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-ink transition hover:bg-surface-strong active:scale-95",
        active && "bg-surface-strong",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Small anchored popover rendered in a portal with fixed positioning (never clipped by scroll areas). */
export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  width = 240,
  align = "end",
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  width?: number;
  align?: "start" | "end";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; origin: string } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const h = panel?.offsetHeight ?? 200;
      const spaceBelow = window.innerHeight - r.bottom;
      const top = spaceBelow < h + 16 && r.top > h + 16 ? r.top - h - 6 : r.bottom + 6;
      let left = align === "end" ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setPos({ top, left, origin: top < r.top ? "bottom" : "top" });
    };
    place();
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, anchorRef, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      onClick={(e) => e.stopPropagation()}
      className="jeju-root jeju-fade fixed z-[1000] text-ink overflow-hidden rounded-2xl bg-white p-1.5 shadow-air-lg"
      style={{
        width,
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        transformOrigin: pos?.origin,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  danger,
  trailing,
  disabled,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] transition hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40",
        danger ? "text-[#c13515]" : "text-ink",
      )}
    >
      {icon ? <span className="grid w-4 place-items-center">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}

export function MenuDivider() {
  return <div className="mx-3 my-1 h-px bg-line-soft" />;
}
