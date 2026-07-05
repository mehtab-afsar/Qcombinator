"use client";

import { useEffect, useState } from "react";

/** True on viewports ≥ 880px — desktop gets the split doodle/form stage, mobile gets a stacked layout. */
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
