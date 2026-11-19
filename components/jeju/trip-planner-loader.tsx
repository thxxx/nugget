"use client";

import dynamic from "next/dynamic";

/* The planner reads localStorage and the Kakao SDK, so it renders on the client only. */
const TripPlanner = dynamic(
  () => import("@/components/jeju/trip-planner").then((m) => m.TripPlanner),
  {
    ssr: false,
    loading: () => (
      <div className="jeju-root flex h-dvh w-full flex-col bg-white lg:flex-row lg:gap-3 lg:p-3">
        <div className="h-[46dvh] animate-pulse bg-surface-soft lg:h-auto lg:flex-1 lg:rounded-[20px]" />
        <div className="flex-1 space-y-4 p-5 lg:w-[460px] lg:flex-none lg:pt-3">
          <div className="h-16 rounded-full border border-line-soft" />
          <div className="h-5 w-40 rounded bg-surface-soft" />
          <div className="h-14 rounded-2xl bg-surface-soft" />
          <div className="h-14 rounded-2xl bg-surface-soft" />
        </div>
      </div>
    ),
  },
);

export function TripPlannerLoader() {
  return <TripPlanner />;
}
