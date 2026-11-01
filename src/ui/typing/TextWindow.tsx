"use client";

import { useLayoutEffect, useRef } from "react";
import type { Mark } from "@/engine/types";
import { Caret } from "./Caret";
import styles from "./Typing.module.css";

const VISIBLE = 3;
const PIVOT = 1;

/** Three wrapped lines of prose; scrolls once the caret reaches the second line. */
export function TextWindow({ marks, idle }: { marks: Mark[]; idle: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const fadeTop = useRef<HTMLDivElement>(null);
  const fadeBot = useRef<HTMLDivElement>(null);

  // Wrapping is only known after layout, so the scroll offset is applied imperatively.
  // Caret's layout effect (a child) runs first and records the caret row on itself.
  useLayoutEffect(() => {
    const box = content.current;
    const caret = box?.querySelector<HTMLElement>("[data-testid=caret]");
    if (!box || !caret) return;
    const lh = parseFloat(getComputedStyle(box).lineHeight) || 46;
    const total = Math.max(1, Math.round(box.scrollHeight / lh));
    const row = Number(caret.dataset.row ?? 0);
    const offset = Math.max(0, Math.min(row - PIVOT, total - VISIBLE));
    box.style.transform = `translateY(${-offset * lh}px)`;
    if (fadeTop.current) fadeTop.current.style.opacity = offset > 0 ? "1" : "0";
    if (fadeBot.current) fadeBot.current.style.opacity = offset < total - VISIBLE ? "1" : "0";
  });

  return (
    <>
      <div className={`${styles.viewport} ${styles.text}`}>
        <div className={styles.clip}>
        <div ref={content} className={styles.content} data-testid="text-target">
          {marks.map((m, i) => (
            <span
              key={i}
              className={styles.ch}
              data-s={m.status}
              data-exp={m.expected}
              data-typed={m.typedWord}
              data-caret={m.caret || undefined}
            >
              {m.ch}
            </span>
          ))}
          <Caret container={content} version={marks} idle={idle} />
        </div>
        </div>
      </div>
      <div ref={fadeTop} className={`${styles.fade} ${styles.fadeTop}`} style={{ opacity: 0 }} />
      <div ref={fadeBot} className={`${styles.fade} ${styles.fadeBot}`} />
    </>
  );
}
