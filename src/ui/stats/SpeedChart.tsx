"use client";

import { useRef, useState } from "react";
import type { Summary } from "@/account/stats";
import styles from "./Stats.module.css";

const W = 640, H = 220, L = 40, R = 12, T = 14, B = 24;

/** One series (speed), one axis; hover shows the attempt's speed, accuracy and date. */
export function SpeedChart({ series, unit, show, modeName, fmtDate }: {
  series: Summary["series"]; unit: string; show: (cpm: number) => number;
  modeName: (m: string) => string; fmtDate: (at: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  const ys = series.map((p) => show(p.cpm));
  const max = Math.max(10, ...ys);
  const step = max > 200 ? 100 : max > 80 ? 50 : max > 40 ? 20 : 10;
  const top = Math.ceil(max / step) * step;
  const x = (i: number) => L + (series.length <= 1 ? (W - L - R) / 2 : (i / (series.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const path = ys.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = ys.length > 1 ? `${path} L${x(ys.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = box.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    series.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  };
  const h = hover !== null ? series[hover] : null;

  return (
    <div className={styles.chartBox}>
      <svg ref={box} className={styles.chart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" data-testid="speed-chart"
        onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`${unit}: ${ys.join(", ")}`}>
        <g className={styles.grid}>{ticks.map((t) => <line key={t} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />)}</g>
        {ticks.map((t) => <text key={t} className={styles.axis} x={L - 8} y={y(t) + 4} textAnchor="end">{t}</text>)}
        {area && <path className={styles.area} d={area} />}
        <path className={styles.line} d={path} vectorEffect="non-scaling-stroke" />
        {ys.length === 1 && <circle className={styles.dot} cx={x(0)} cy={y(ys[0])} r={5} />}
        {h && hover !== null && (
          <>
            <line className={styles.cross} x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} vectorEffect="non-scaling-stroke" />
            <circle className={styles.dot} cx={x(hover)} cy={y(ys[hover])} r={5} />
          </>
        )}
        {/* last point stays labelled */}
        {ys.length > 0 && <text className={styles.axis} x={x(ys.length - 1)} y={y(ys.at(-1)!) - 10} textAnchor="end">{ys.at(-1)}</text>}
      </svg>
      {h && hover !== null && (
        <div className={styles.tooltip} data-testid="chart-tooltip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(ys[hover]) / H) * 100}%` }}>
          <b>{ys[hover]}</b> {unit} · {h.accuracy}% · {modeName(h.mode)} · {fmtDate(h.at)}
        </div>
      )}
    </div>
  );
}
