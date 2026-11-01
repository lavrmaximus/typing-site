"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";
const subscribe = (cb: () => void) => {
  const mq = matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** true on touch-first devices (phones, tablets); false during server render. */
export const useCoarsePointer = () => useSyncExternalStore(subscribe, () => matchMedia(QUERY).matches, () => false);
