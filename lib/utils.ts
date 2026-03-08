import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeNickname(nickname: string) {
  return nickname.trim().toLowerCase();
}

export function hashToColor(input: string) {
  const palette = [
    "#2563EB",
    "#0F766E",
    "#7C3AED",
    "#B45309",
    "#BE123C",
    "#166534",
    "#1D4ED8",
    "#9A3412",
  ];

  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  const safeIndex = Math.abs(hash) % palette.length;
  return palette[safeIndex];
}

export function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}
