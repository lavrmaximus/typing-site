"use client";

import { useEffect } from "react";
import { LAST_PATH_KEY } from "@/i18n/start";

/** Remembers the last language and mode so "/" brings the visitor back to them. */
export function RememberPath({ path }: { path: string }) {
  useEffect(() => {
    try { localStorage.setItem(LAST_PATH_KEY, path); } catch { /* not remembered this time */ }
  }, [path]);
  return null;
}
