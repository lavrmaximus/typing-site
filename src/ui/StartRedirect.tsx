"use client";

import { useEffect } from "react";
import type { Lang } from "@/i18n/dict";
import { LAST_PATH_KEY, startPath } from "@/i18n/start";

/** Static hosting has no server redirects: pick the start page in the browser. */
export function StartRedirect({ lang }: { lang: Lang | null }) {
  useEffect(() => {
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_PATH_KEY); } catch { /* storage blocked: use defaults */ }
    location.replace(startPath(lang, last, navigator.languages ?? [navigator.language]));
  }, [lang]);
  return null;
}
