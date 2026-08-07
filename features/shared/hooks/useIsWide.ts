"use client";

import { useEffect, useState } from "react";

/**
 * True on viewports ≥ 880px — the shared desktop/mobile breakpoint for split
 * doodle/form stages, scroll-pinned vs. compact heroes, and similar layout swaps.
 * SSR-safe: false until mounted.
 */
export function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 880px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}
