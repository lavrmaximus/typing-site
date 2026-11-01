"use client";

import { useEffect, useRef } from "react";
import styles from "./Typing.module.css";
import { KeyButton } from "../KeyCap";

export interface ResultLabels { unit: string; accuracy: string; time: string; errors: string; again: string }

export function ResultPanel(props: { speed: number; accuracy: number; seconds: number; errors: number; samples: number[]; labels: ResultLabels; onAgain: () => void }) {
  const { speed, accuracy, seconds, errors, samples, labels, onAgain } = props;
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => { btn.current?.focus({ preventScroll: true }); }, []);
  const pts = samples.length > 1 ? samples : [0, ...samples, 0].slice(0, 2);
  const max = Math.max(...pts, 1);
  const W = 220, H = 50;
  const line = pts.map((v, i) => `${((i / (pts.length - 1)) * W).toFixed(1)},${(H - (v / max) * (H - 6) - 3).toFixed(1)}`).join(" ");
  return (
    <div className={styles.result} data-testid="result" role="status">
      <div className={styles.card}>
        <div className={styles.big}>{speed}<small>{labels.unit}</small></div>
        <div className={styles.side}>
          <div className={styles.stats}>
            <div><b data-testid="result-accuracy">{accuracy}%</b><span>{labels.accuracy}</span></div>
            <div><b>{Math.round(seconds)}s</b><span>{labels.time}</span></div>
            <div><b>{errors}</b><span>{labels.errors}</span></div>
          </div>
          <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <polyline points={line} fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div><KeyButton ref={btn} accent onClick={onAgain}>{labels.again} · Enter</KeyButton></div>
        </div>
      </div>
    </div>
  );
}
