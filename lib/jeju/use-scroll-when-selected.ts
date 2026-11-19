"use client";

import { useEffect, useRef } from "react";

/** Scrolls the element into view when it becomes selected (e.g. by clicking its pin on the map). */
export function useScrollWhenSelected<T extends HTMLElement>(selected: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  return ref;
}
