"use client";

import { useEffect, useState } from "react";

/**
 * True on viewports ≥ 880px. Used to pick the scroll-pinned hero (desktop)
 * vs. the compact static hero (mobile). SSR-safe: false until mounted.
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
