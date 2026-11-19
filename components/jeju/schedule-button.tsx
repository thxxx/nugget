"use client";

import { CalendarPlus, Check, ChevronDown, Plus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { MenuDivider, MenuItem, Popover } from "@/components/jeju/primitives";
import { dayColor, dayDate } from "@/lib/jeju/colors";
import type { Place } from "@/lib/jeju/types";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/store/useTripStore";
import { useTripUiStore } from "@/store/useTripUiStore";

export function ScheduleButton({
  place,
  variant = "chip",
}: {
  place: Place;
  variant?: "chip" | "overlay" | "primary";
}) {
  const days = useTripStore((s) => s.days);
  const startDate = useTripStore((s) => s.startDate);
  const addToDay = useTripStore((s) => s.addToDay);
  const addToNewDay = useTripStore((s) => s.addToNewDay);
  const removeFromDays = useTripStore((s) => s.removeFromDays);
  const showToast = useTripUiStore((s) => s.showToast);
  const setTab = useTripUiStore((s) => s.setTab);

  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const dayIndex = days.findIndex((d) => d.placeIds.includes(place.id));
  const scheduled = dayIndex >= 0;
  const color = scheduled ? dayColor(dayIndex) : undefined;

  const goToTrip = { label: "일정 보기", onAction: () => setTab("trip") };

  return (
    <>
      {variant === "overlay" ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-white/95 px-2.5 text-[12px] font-semibold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-white active:scale-95"
        >
          {scheduled ? (
            <>
              <span className="size-1.5 rounded-full" style={{ background: color }} />
              {dayIndex + 1}일차
            </>
          ) : (
            <>
              <Plus size={13} strokeWidth={2.6} />
              일정
            </>
          )}
        </button>
      ) : variant === "chip" ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold transition active:scale-95",
            scheduled
              ? "hover:brightness-95"
              : "border border-line bg-white text-ink hover:border-ink",
          )}
          style={scheduled ? { background: `${color}17`, color } : undefined}
        >
          {scheduled ? (
            <>
              <span className="size-1.5 rounded-full" style={{ background: color }} />
              {dayIndex + 1}일차
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2.5} />
              일정
            </>
          )}
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-[15px] font-semibold transition active:scale-[0.98]",
            scheduled
              ? "border border-ink bg-white text-ink"
              : "bg-rausch text-white hover:bg-rausch-active",
          )}
        >
          {scheduled ? (
            <>
              <span className="size-2 rounded-full" style={{ background: color }} />
              {dayIndex + 1}일차 일정
              <ChevronDown size={16} />
            </>
          ) : (
            <>
              <CalendarPlus size={17} strokeWidth={2.2} />
              일정에 추가
            </>
          )}
        </button>
      )}

      <Popover open={open} onClose={close} anchorRef={anchorRef} width={232}>
        <p className="px-3 pb-1.5 pt-2 text-[12px] font-semibold text-ink-muted">
          언제 갈까요?
        </p>
        {days.map((d, i) => {
          const date = dayDate(startDate, i);
          return (
            <MenuItem
              key={d.id}
              icon={<span className="size-2.5 rounded-full" style={{ background: dayColor(i) }} />}
              trailing={
                i === dayIndex ? (
                  <Check size={16} className="text-ink" />
                ) : (
                  <span className="text-[12px] text-ink-soft">{d.placeIds.length}곳</span>
                )
              }
              onClick={() => {
                close();
                if (i === dayIndex) return;
                addToDay(place, d.id);
                showToast(`${i + 1}일차에 ‘${place.name}’ 추가`, goToTrip);
              }}
            >
              <span className="font-medium">{i + 1}일차</span>
              {date ? <span className="ml-1.5 text-ink-muted">{date.short}</span> : null}
            </MenuItem>
          );
        })}
        <MenuItem
          icon={<Plus size={16} />}
          onClick={() => {
            close();
            addToNewDay(place);
            showToast(`${days.length + 1}일차를 만들고 ‘${place.name}’ 추가`, goToTrip);
          }}
        >
          {days.length + 1}일차 새로 만들기
        </MenuItem>
        {scheduled ? (
          <>
            <MenuDivider />
            <MenuItem
              danger
              icon={<X size={16} />}
              onClick={() => {
                close();
                removeFromDays(place.id);
                showToast(`일정에서 ‘${place.name}’ 뺐어요`);
              }}
            >
              일정에서 빼기
            </MenuItem>
          </>
        ) : null}
      </Popover>
    </>
  );
}
