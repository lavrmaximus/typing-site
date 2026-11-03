"use client";

import { useEffect, useRef } from "react";
import { FINGER_ROWS, KEY_ROWS, RU_ROWS, keyFor, type KeyRef } from "@/course/layout";
import styles from "./Keyboard.module.css";

export const keyIdFor = (ch: string) => {
  if (ch === "\n") return "enter";
  if (ch === "\b") return "backspace";
  if (ch === "\t") return "tab";
  return keyFor(ch, /[а-яё]/i.test(ch) ? "ru" : "en")?.id ?? null;
};

export interface KeyPress { ch: string; at: number }

interface Props {
  press: KeyPress | null;
  /** which legend is drawn large (the other one small); default: Latin */
  primary?: "en" | "ru";
  /** key to press next (course mode) */
  hint?: KeyRef | null;
  /** tint keys by the finger that presses them (course mode) */
  fingers?: boolean;
  /** keys of the current lesson get a ring */
  focus?: string[];
}

const LEFT_HAND = (id: string) => {
  for (let r = 0; r < KEY_ROWS.length; r++) {
    const i = KEY_ROWS[r].indexOf(id);
    if (i >= 0) return FINGER_ROWS[r][i] <= 3;
  }
  return false;
};

/** On-screen keyboard: dips the key of each keystroke; in course mode shows the next key and fingers. */
export function Keyboard({ press, primary = "en", hint = null, fingers = false, focus = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!press || !ref.current) return;
    const id = keyIdFor(press.ch);
    const el = id && ref.current.querySelector<HTMLElement>(`[data-k="${CSS.escape(id)}"]`);
    if (!el) return;
    el.classList.add(styles.down);
    const t = setTimeout(() => el.classList.remove(styles.down), 110);
    return () => { clearTimeout(t); el.classList.remove(styles.down); };
  }, [press]);

  // Shift is pressed with the hand that does not press the letter
  const shiftId = hint?.shift ? (LEFT_HAND(hint.id) ? "rshift" : "lshift") : null;
  const focusIds = new Set(focus.map((ch) => keyFor(ch, primary)?.id).filter(Boolean) as string[]);

  const key = (id: string, label: string, extra = "", legend = "", finger: number | null = null) => (
    <div
      key={id}
      className={`${styles.key} ${extra} ${fingers && finger !== null ? styles[`f${finger}`] : ""} ${focusIds.has(id) ? styles.focus : ""}`}
      data-k={id}
      data-next={hint?.id === id || shiftId === id || undefined}
    >
      <span className={styles.l}>{label}</span>
      {legend && <span className={styles.c}>{legend}</span>}
    </div>
  );
  const legends = (r: number, i: number) => {
    const lat = KEY_ROWS[r][i];
    const cyr = RU_ROWS[r][i];
    if (r === 0) return primary === "ru" && i === 0 ? ["ё", ""] : [lat, ""];
    return primary === "ru" ? [cyr, lat] : [lat, cyr];
  };

  return (
    <div className={styles.kb} ref={ref} aria-hidden="true" data-testid="keyboard">
      {KEY_ROWS.map((row, r) => (
        <div className={styles.row} key={r}>
          {r === 1 && key("tab", "tab", styles.mod)}
          {r === 2 && key("caps", "caps", styles.mod)}
          {r === 3 && key("lshift", "shift", styles.mod)}
          {[...row].map((k, i) => {
            const [big, small] = legends(r, i);
            return key(k, big, k === "f" || k === "j" ? styles.home : "", small, FINGER_ROWS[r][i]);
          })}
          {r === 0 && key("backspace", "⌫", styles.mod)}
          {r === 1 && key("\\", "\\", "", "", 7)}
          {r === 2 && key("enter", "enter", styles.mod)}
          {r === 3 && key("rshift", "shift", styles.mod)}
        </div>
      ))}
      <div className={styles.row}>
        {key("lctrl", "ctrl", styles.mod)}
        {key("lalt", "alt", styles.mod)}
        {key("space", "", styles.space, "", fingers ? 4 : null)}
        {key("ralt", "alt", styles.mod)}
        {key("rctrl", "ctrl", styles.mod)}
      </div>
    </div>
  );
}
