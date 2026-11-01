"use client";

import { useCallback, useEffect, useState } from "react";

export interface Prefs {
  textKind: "lit" | "words";
  wordCount: 25 | 50 | 100;
  /** null = decide from the device (coarse pointer) */
  phone: boolean | null;
  keyboard: boolean;
}

const KEY = "ritm.prefs";
export const DEFAULT_PREFS: Prefs = { textKind: "lit", wordCount: 50, phone: null, keyboard: true };

function read(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Per-browser settings. Rendering starts from defaults and adopts saved values after mount. */
export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void, boolean] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setPrefs(read());
    setLoaded(true);
  }, []);
  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* not persisted */ }
      return next;
    });
  }, []);
  return [prefs, update, loaded];
}
