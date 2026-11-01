"use client";

import { useEffect, useRef } from "react";
import styles from "./Keyboard.module.css";

const ROWS: Array<[string, string]> = [
  ["qwertyuiop[]", "йцукенгшщзхъ"],
  ["asdfghjkl;'", "фывапролджэ"],
  ["zxcvbnm,./", "ячсмитьбю."],
];

/** Physical key id for a produced character: Latin and Cyrillic legends share keys. */
const KEY_OF = new Map<string, string>();
ROWS.forEach(([lat, cyr]) => [...lat].forEach((k, i) => {
  KEY_OF.set(k, k);
  if (cyr[i]) KEY_OF.set(cyr[i], k);
}));
KEY_OF.set("ё", "`");
KEY_OF.set(" ", "space");
KEY_OF.set("\n", "enter");
KEY_OF.set("\b", "backspace");

export const keyIdFor = (ch: string) => KEY_OF.get(ch.toLowerCase()) ?? null;

export interface KeyPress { ch: string; at: number }

/** On-screen keyboard that dips and lights the key of each keystroke. */
export function Keyboard({ press }: { press: KeyPress | null }) {
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

  const key = (id: string, label: string, extra = "", legend = "") => (
    <div key={id} className={`${styles.key} ${extra}`} data-k={id}>
      <span className={styles.l}>{label}</span>
      {legend && <span className={styles.c}>{legend}</span>}
    </div>
  );
  return (
    <div className={styles.kb} ref={ref} aria-hidden="true" data-testid="keyboard">
      {ROWS.map(([lat, cyr], r) => (
        <div className={styles.row} key={r}>
          {r === 0 && key("esc", "esc", `${styles.mod} ${styles.esc}`)}
          {r === 1 && key("caps", "caps", styles.mod)}
          {r === 2 && key("lshift", "shift", styles.mod)}
          {[...lat].map((k, i) => key(k, k, k === "f" || k === "j" ? styles.home : "", cyr[i]))}
          {r === 0 && key("backspace", "⌫", styles.mod)}
          {r === 1 && key("enter", "enter", styles.mod)}
          {r === 2 && key("rshift", "shift", styles.mod)}
        </div>
      ))}
      <div className={styles.row}>
        {key("lctrl", "ctrl", styles.mod)}
        {key("lalt", "alt", styles.mod)}
        {key("space", "", styles.space)}
        {key("ralt", "alt", styles.mod)}
        {key("rctrl", "ctrl", styles.mod)}
      </div>
    </div>
  );
}
