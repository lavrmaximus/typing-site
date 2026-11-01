"use client";

import { useEffect } from "react";
import { LAST_PATH_COOKIE } from "@/i18n/dict";

/** Remembers the last language and mode so "/" brings the visitor back to them. */
export function RememberPath({ path }: { path: string }) {
  useEffect(() => {
    document.cookie = `${LAST_PATH_COOKIE}=${path}; path=/; max-age=31536000; samesite=lax`;
  }, [path]);
  return null;
}
