"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { CATEGORY_ICONS } from "@/components/jeju/primitives";
import { CATEGORY_META } from "@/lib/jeju/category";
import type { Place } from "@/lib/jeju/types";
import { cn } from "@/lib/utils";
import { usePhotoStore, usePlacePhotos } from "@/store/usePhotoStore";

/**
 * A representative photo for a place. `variant="thumb"` uses Kakao's 130px CDN thumbnail
 * (instant, for small tiles); `variant="cover"` loads the original through next/image.
 * `controls` adds Airbnb-style carousel arrows + dots (shown on hover of a `group` parent);
 * flipping changes the place's cover photo everywhere.
 */
export function PlacePhoto({
  place,
  index = 0,
  variant = "cover",
  sizes = "240px",
  className,
  iconSize = 22,
  priority,
  controls,
}: {
  place: Place;
  index?: number;
  variant?: "cover" | "thumb";
  sizes?: string;
  className?: string;
  iconSize?: number;
  priority?: boolean;
  controls?: boolean;
}) {
  const { photos, loading, cover, count } = usePlacePhotos(place);
  const setCover = usePhotoStore((s) => s.setCover);
  const [failed, setFailed] = useState<string[]>([]);

  const usable = photos.filter((p) => !failed.includes(variant === "thumb" ? p.thumb : p.src));
  const photo = usable[index] ?? usable[0];
  const meta = CATEGORY_META[place.category];
  const Icon = CATEGORY_ICONS[place.category];

  const flip = (delta: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count < 2) return;
    setCover(place.id, (cover + delta + count) % count);
  };

  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ background: meta.tint }}
    >
      {photo ? (
        variant === "thumb" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={photo.thumb}
            src={photo.thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed((f) => [...f, photo.thumb])}
            className="jeju-fade absolute inset-0 size-full object-cover"
          />
        ) : (
          <Image
            key={photo.src}
            src={photo.src}
            alt={place.name}
            fill
            sizes={sizes}
            priority={priority}
            onError={() => setFailed((f) => [...f, photo.src])}
            className="jeju-fade object-cover"
          />
        )
      ) : (
        <span
          className={cn("absolute inset-0 grid place-items-center", loading && "animate-pulse")}
          style={{ color: meta.color }}
        >
          <Icon size={iconSize} strokeWidth={1.8} />
        </span>
      )}

      {controls && count > 1 ? (
        <>
          <button
            type="button"
            aria-label="이전 사진"
            onClick={flip(-1)}
            className="absolute left-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition hover:scale-105 hover:bg-white group-hover:opacity-100"
          >
            <ChevronLeft size={15} strokeWidth={2.6} />
          </button>
          <button
            type="button"
            aria-label="다음 사진"
            onClick={flip(1)}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink opacity-0 shadow-[0_1px_4px_rgba(0,0,0,0.2)] transition hover:scale-105 hover:bg-white group-hover:opacity-100"
          >
            <ChevronRight size={15} strokeWidth={2.6} />
          </button>
          <span className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
            {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full bg-white shadow-[0_0_2px_rgba(0,0,0,0.4)] transition-opacity",
                  i === Math.min(cover, 4) ? "opacity-100" : "opacity-55",
                )}
              />
            ))}
          </span>
        </>
      ) : null}
    </span>
  );
}
