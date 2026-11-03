"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Lang } from "@/i18n/dict";
import { clearGuest, pushGuest, readGuest } from "./guest";
import { isPlausible } from "./plausible";
import type { Me, Result } from "./types";

export type ApiError = "taken" | "wrong" | "throttled" | "invalid" | "offline" | "linked-elsewhere" | "unknown";

export interface AccountState {
  status: "loading" | "guest" | "user";
  me: Me | null;
  telegramBot: string | null;
  /** false when the site runs without its API (e.g. plain static hosting) */
  online: boolean;
}

let state: AccountState = { status: "loading", me: null, telegramBot: null, online: true };
const listeners = new Set<() => void>();
const set = (patch: Partial<AccountState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: ApiError }> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    return { ok: false, error: "offline" };
  }
  if (res.ok) return { ok: true, data: (await res.json()) as T };
  const error: ApiError =
    res.status === 409 ? (path.includes("telegram") ? "linked-elsewhere" : "taken")
    : res.status === 401 ? "wrong"
    : res.status === 429 ? "throttled"
    : res.status === 422 ? "invalid"
    : res.status === 404 || res.status >= 500 ? "offline"
    : "unknown";
  return { ok: false, error };
}

let started = false;
async function init() {
  if (started) return;
  started = true;
  const [cfg, me] = await Promise.all([api<{ telegramBot: string | null }>("/config"), api<Me>("/me")]);
  const online = cfg.ok;
  set({ online, telegramBot: cfg.ok ? cfg.data.telegramBot : null });
  if (me.ok) {
    set({ status: "user", me: me.data });
    void uploadGuest();
  } else set({ status: "guest", me: null });
}

/** Move results typed as a guest into the account. */
async function uploadGuest() {
  const queued = readGuest().filter(isPlausible);
  if (!queued.length) return clearGuest();
  const res = await api("/results", { method: "POST", body: JSON.stringify(queued) });
  if (res.ok) clearGuest();
}

async function signedIn(res: Awaited<ReturnType<typeof api<Me>>>) {
  if (!res.ok) return res.error;
  set({ status: "user", me: res.data });
  await uploadGuest();
  return null;
}

export const register = async (username: string, password: string) =>
  signedIn(await api<Me>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }));

export const login = async (username: string, password: string) =>
  signedIn(await api<Me>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }));

/** Data from the Telegram Login Widget; signs in or links Telegram to the current account. */
export const telegramLogin = async (data: Record<string, unknown>) =>
  signedIn(await api<Me>("/auth/telegram", { method: "POST", body: JSON.stringify(data) }));

export async function logout() {
  await api("/auth/logout", { method: "POST" });
  set({ status: "guest", me: null });
}

/** Save a finished attempt: to the account when signed in, else to the guest queue. */
export async function recordResult(result: Result) {
  if (!isPlausible(result)) return;
  if (state.status === "user") {
    const res = await api("/results", { method: "POST", body: JSON.stringify([result]) });
    if (res.ok) return;
  }
  pushGuest(result);
}

export async function loadResults(lang: Lang): Promise<Result[]> {
  const guest = readGuest().filter((r) => r.lang === lang);
  if (state.status !== "user") return guest;
  const res = await api<Result[]>(`/results?lang=${lang}`);
  return res.ok ? [...res.data, ...guest] : guest;
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));
const SERVER: AccountState = { status: "loading", me: null, telegramBot: null, online: true };

export function useAccount(): AccountState {
  useEffect(() => { void init(); }, []);
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}
