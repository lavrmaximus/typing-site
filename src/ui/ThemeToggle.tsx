"use client";

import { useSyncExternalStore } from "react";
import { KeyButton } from "./KeyCap";

export const THEME_KEY = "ritm.theme";

/** Runs before paint: apply the saved theme, else the system preference. */
export const THEME_INIT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;

type Theme = "light" | "dark";

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function ThemeToggle({ toLight, toDark }: { toLight: string; toDark: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => null);
  const flip = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage unavailable: theme lasts this visit */ }
  };
  const label = theme === "light" ? toDark : toLight;
  return (
    <KeyButton onClick={flip} aria-label={label} title={label}>
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
    </KeyButton>
  );
}
