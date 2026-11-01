"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import styles from "./Typing.module.css";

/**
 * The one persistent caret. After each render it glides to the element marked
 * `data-caret` inside `container` (or past the last char when none is marked).
 * `line` overrides the vertical row (code mode knows it exactly).
 */
export function Caret({ container, version, line, idle }: { container: RefObject<HTMLElement | null>; version: unknown; line?: number; idle: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const box = container.current;
    const caret = ref.current;
    if (!box || !caret) return;
    const lh = parseFloat(getComputedStyle(box).lineHeight) || 32;
    let at = box.querySelector<HTMLElement>("[data-caret]");
    let x: number;
    if (at) x = at.offsetLeft;
    else {
      const all = box.querySelectorAll<HTMLElement>("[data-s]");
      at = all[all.length - 1] ?? null;
      x = at ? at.offsetLeft + at.offsetWidth : 0;
    }
    const row = line ?? (at ? Math.round((at.offsetTop - (box.querySelector<HTMLElement>("[data-s]")?.offsetTop ?? 0)) / lh) : 0);
    const h = lh * 0.62;
    caret.style.height = `${h}px`;
    // the very first placement must not glide in from the corner
    if (!placed.current) caret.style.transition = "none";
    caret.style.transform = `translate(${x}px, ${row * lh + (lh - h) / 2}px)`;
    if (!placed.current) {
      void caret.offsetWidth;
      caret.style.transition = "";
      placed.current = true;
    }
    caret.dataset.row = String(row);
  }, [container, version, line]);
  return <div ref={ref} className={styles.caret} data-testid="caret" data-idle={idle || undefined} aria-hidden="true" />;
}
