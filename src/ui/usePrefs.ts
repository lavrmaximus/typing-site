"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface Prefs {
  textKind: "lit" | "words";
  wordCount: 25 | 50 | 100;
  /** null = decide from the device (coarse pointer) */
  phone: boolean | null;
  keyboard: boolean;
}

const KEY = "ritm.prefs";
export const DEFAULT_PREFS: Prefs = { textKind: "lit", wordCount: 50, phone: null, keyboard: true };

let cache: Prefs | null = null;
const listeners = new Set<() => void>();

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    cache = DEFAULT_PREFS;
  }
  return cache!;
}

function write(patch: Partial<Prefs>) {
  cache = { ...read(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* kept for this visit only */ }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

/** Per-browser settings; the server render uses the defaults. */
export function usePrefs(): [Prefs, (patch: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
  const update = useCallback((patch: Partial<Prefs>) => write(patch), []);
  return [prefs, update];
}
