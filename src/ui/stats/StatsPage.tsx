"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/account/account";
import { summarize } from "@/account/stats";
import { inputOf, RESULT_MODES, type ResultInput, type ResultMode } from "@/account/types";
import { keyFor } from "@/course/layout";
import { lessonsFor } from "@/course/lessons";
import type { Dict, Lang } from "@/i18n/dict";
import { KeyButton } from "../KeyCap";
import { Keyboard } from "../Keyboard";
import { useCoarsePointer } from "../useCoarsePointer";
import { usePrefs } from "../usePrefs";
import { useResults } from "../course/useResults";
import { SpeedChart } from "./SpeedChart";
import styles from "./Stats.module.css";

export function StatsPage({ lang, d }: { lang: Lang; d: Dict }) {
  const { status } = useAccount();
  const all = useResults(lang);
  const [prefs] = usePrefs();
  const coarse = useCoarsePointer();
  const [picked, setPicked] = useState<ResultInput | null>(null);
  const input: ResultInput = picked ?? ((prefs.phone ?? coarse) ? "phone" : "keys");
  const show = (cpm: number) => (lang === "en" ? Math.round(cpm / 5) : cpm);
  const modeName = (m: string) => ({ code: d.modeCode, lit: d.modeLit, words: d.modeWords, lesson: d.modeLesson })[m as ResultMode] ?? m;
  const fmt = new Intl.DateTimeFormat(lang === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const fmtDate = (at: number) => fmt.format(new Date(at));

  const head = (
    <>
      <h1 className={styles.title}>{d.statsTitle}</h1>
      {status === "guest" && <p className={styles.note}>{d.statsGuest} <Link href={`/${lang}/account`}>{d.signIn}</Link></p>}
    </>
  );
  if (!all) return head;
  if (!all.length) return <>{head}<div className={`${styles.panel} ${styles.empty}`} data-testid="stats-empty">{d.statsEmpty}</div></>;

  const counts = { keys: 0, phone: 0 };
  for (const r of all) counts[inputOf(r)]++;
  const results = all.filter((r) => inputOf(r) === input);
  const switcher = (
    <div className={styles.inputs}>
      <div className={styles.switch} role="group" aria-label={d.inputSplitNote}>
        {(["keys", "phone"] as const).map((k) => (
          <KeyButton key={k} pressed={input === k} onClick={() => setPicked(k)} data-testid={`input-${k}`}>
            {k === "keys" ? d.inputKeys : d.inputPhone} · {counts[k]}
          </KeyButton>
        ))}
      </div>
      <p className={styles.note}>{d.inputSplitNote}</p>
    </div>
  );
  if (!results.length) return <>{head}{switcher}<div className={`${styles.panel} ${styles.empty}`} data-testid="stats-empty-input">{d.statsEmptyInput}</div></>;

  const s = summarize(results);
  const minutes = Math.round(s.totalMs / 60000);
  const time = minutes >= 60 ? `${Math.floor(minutes / 60)} ${d.hoursShort} ${minutes % 60} ${d.minutesShort}` : `${Math.max(1, minutes)} ${d.minutesShort}`;
  const modes = RESULT_MODES.filter((m) => s.byMode[m].count > 0);
  const maxMode = Math.max(1, ...modes.map((m) => s.byMode[m].avgCpm));
  const heat: Record<string, number> = {};
  const maxMiss = Math.max(1, ...Object.values(s.missed));
  for (const [ch, n] of Object.entries(s.missed)) {
    const id = keyFor(ch, lang)?.id;
    if (id) heat[id] = Math.min(1, (heat[id] ?? 0) + n / maxMiss);
  }
  const lessons = lessonsFor(lang);
  // a lesson passed counts whatever it was typed on
  const progress = summarize(all).lessons;
  const passed = lessons.filter((l) => (progress[l.id]?.stars ?? 0) > 0).length;
  const recent = [...results].sort((a, b) => b.at - a.at).slice(0, 20);

  return (
    <>
      {head}
      {switcher}
      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.hero}`}><b>{show(s.bestCpm)}</b><span>{d.tileBest}, {d.unit}</span></div>
        <div className={styles.tile}><b>{show(s.avgCpm)}</b><span>{d.tileAvg}</span></div>
        <div className={styles.tile}><b>{s.avgAccuracy}%</b><span>{d.tileAcc}</span></div>
        <div className={styles.tile}><b data-testid="tile-count">{s.count}</b><span>{d.tileCount}</span></div>
        <div className={styles.tile}><b>{time}</b><span>{d.tileTime}</span></div>
      </div>

      <section className={styles.panel}>
        <h2>{d.chartTitle}, {d.unit}</h2>
        <SpeedChart series={s.series} unit={d.unit} show={show} modeName={modeName} fmtDate={fmtDate} />
      </section>

      <div className={styles.cols}>
        <section className={styles.panel}>
          <h2>{d.byModeTitle}</h2>
          <div className={styles.bars}>
            {modes.map((m) => (
              <div key={m} className={styles.bar} title={`${modeName(m)}: ${show(s.byMode[m].avgCpm)} ${d.unit}`}>
                <span>{modeName(m)}</span>
                <i style={{ width: `${(s.byMode[m].avgCpm / maxMode) * 100}%` }} />
                <em>{show(s.byMode[m].avgCpm)} · {s.byMode[m].count}×</em>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.panel}>
          <h2>{d.courseProgress}</h2>
          <p className={styles.course}><b>{passed} / {lessons.length}</b> {d.lessonsPassed}</p>
          <Link href={`/${lang}/course`} className={styles.note}>{d.toCourse} →</Link>
        </section>
      </div>

      <section className={styles.panel}>
        <h2>{d.missedTitle}</h2>
        {s.missedTop.length ? (
          <ul className={styles.missed} data-testid="missed-list">
            {s.missedTop.map((m) => <li key={m.ch}><kbd>{m.ch === " " ? "␣" : m.ch}</kbd>{m.count} {d.timesMissed}</li>)}
          </ul>
        ) : <p className={styles.note}>{d.missedNone}</p>}
        <Keyboard press={null} primary={lang} heat={heat} />
      </section>

      <section className={styles.panel}>
        <h2>{d.recentTitle}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>{d.colDate}</th><th>{d.colMode}</th><th className={styles.num}>{d.unit}</th><th className={styles.num}>{d.accuracy}</th><th className={styles.num}>{d.errors}</th></tr></thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={`${r.at}-${i}`}><td>{fmtDate(r.at)}</td><td>{modeName(r.mode)}</td><td className={styles.num}>{show(r.cpm)}</td><td className={styles.num}>{r.accuracy}%</td><td className={styles.num}>{r.errors}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
