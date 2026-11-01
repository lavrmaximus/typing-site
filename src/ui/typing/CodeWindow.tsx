"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { codeCursor, codeView, type CodeState } from "@/engine/code";
import { tokenizePython } from "@/engine/python-tokens";
import { Caret } from "./Caret";
import styles from "./Typing.module.css";

const VISIBLE = 5;
const PIVOT = 2;

/** Five-line editor window that scrolls once the caret passes its middle. */
export function CodeWindow({ state, idle }: { state: CodeState; idle: boolean }) {
  const tokens = useMemo(() => tokenizePython(state.target), [state.target]);
  const view = codeView(state, tokens);
  const { line } = codeCursor(state);
  const offset = Math.max(0, Math.min(line - PIVOT, view.length - VISIBLE));
  const vp = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);

  // keep the caret in view horizontally on long lines
  useLayoutEffect(() => {
    const box = vp.current;
    const at = content.current?.querySelector<HTMLElement>("[data-caret]");
    if (!box || !at) return;
    const pad = 64;
    const x = at.offsetLeft;
    if (x - box.scrollLeft > box.clientWidth - pad) box.scrollLeft = x - box.clientWidth + pad * 2;
    else if (x - box.scrollLeft < pad) box.scrollLeft = Math.max(0, x - pad * 2);
  });

  return (
    <>
      <div ref={vp} className={`${styles.viewport} ${styles.code}`}>
        <div
          ref={content}
          className={styles.content}
          data-testid="code-content"
          style={{ transform: `translateY(calc(var(--lh) * ${-offset}))` }}
        >
          {view.map((l) => (
            <div key={l.index} className={styles.row} data-current={l.current || undefined} data-extra={l.extra || undefined}>
              <span className={styles.num}>{l.index + 1}</span>
              <span>
                {l.marks.map((m, j) => (
                  <span
                    key={j}
                    className={styles.ch}
                    data-s={m.status}
                    data-t={m.token || undefined}
                    data-exp={m.expected}
                    data-caret={m.caret || undefined}
                  >
                    {m.ch}
                  </span>
                ))}
                {l.ghosts && <span className={styles.ghosts} aria-hidden="true">{l.ghosts}</span>}
              </span>
            </div>
          ))}
          <Caret container={content} version={state} line={line} idle={idle} />
        </div>
      </div>
      <div className={`${styles.fade} ${styles.fadeTop}`} style={{ opacity: offset > 0 ? 1 : 0 }} />
      <div className={`${styles.fade} ${styles.fadeBot}`} style={{ opacity: offset < view.length - VISIBLE ? 1 : 0 }} />
    </>
  );
}
