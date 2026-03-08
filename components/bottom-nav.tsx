"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type BottomNavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: BottomNavItem[] = [
  {
    key: "map",
    href: "/map",
    label: "지도",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l-6 3V6l6-3m0 15l6 3m-6-18v15m6 3l6-3V3l-6 3m0 15V6" />
      </svg>
    ),
  },
  {
    key: "following",
    href: "/follows",
    label: "팔로잉",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3.2" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    ),
  },
  {
    key: "saved",
    href: "/saves",
    label: "프로필",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 h-[var(--nugget-bottom-nav-offset)] w-full max-w-[430px] -translate-x-1/2 border-t border-black/6 bg-white/88 px-3 pb-[var(--nugget-bottom-nav-safe)] pt-2 backdrop-blur-xl">
      <ul className="grid h-full grid-cols-3 gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center justify-center rounded-full px-3 py-2.5 transition-all duration-200",
                  isActive
                    ? "bg-[#f2f3f1] text-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    : "text-[#8a8f87] hover:bg-black/[0.03] hover:text-[#4a4f49]",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                      isActive
                        ? "bg-white shadow-[0_1px_2px_rgba(17,17,17,0.06)]"
                        : "bg-transparent",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] tracking-[-0.01em]",
                      isActive ? "font-semibold" : "font-medium",
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
