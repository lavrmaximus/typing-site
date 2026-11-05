"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { generateExercises } from "@/course/exercises";
import { gradeLesson, targetCpm } from "@/course/grading";
import { fingerFor, keyFor } from "@/course/layout";
import { getLesson, lessonsFor } from "@/course/lessons";
import { textCorrectChars } from "@/engine/metrics";
import { applyTextKey, createTextState, isTextComplete, textMarks, type TextState } from "@/engine/text";
import { speed, accuracy as accuracyOf } from "@/engine/metrics";
import type { Dict, Lang } from "@/i18n/dict";
import { Device } from "../Device";
import { KeyButton, KeyLink } from "../KeyCap";
import { Keyboard } from "../Keyboard";
import { Readout } from "../Readout";
import { TextWindow } from "../typing/TextWindow";
import { useCaptureInput } from "../typing/useCaptureInput";
import { useRecordOnDone } from "../typing/useRecordOnDone";
import { useCoarsePointer } from "../useCoarsePointer";
import { useTypingSession, type Engine } from "../typing/useTypingSession";
import { Stars } from "./CourseList";
import { lessonTitle } from "./lessonTitle";
import styles from "./Course.module.css";
import tstyles from "../typing/Typing.module.css";

interface ExerciseStats { correct: number; keys: number; errors: number; ms: number; missed: Record<string, number> }

const loadMaterial = (lang: Lang) =>
  lang === "ru"
    ? Promise.all([import("../../../content/words.ru.json"), import("../../../content/texts.ru.json")]).then(([w, t]) => ({ words: w.default as string[], texts: t.default.map((p) => p.text) }))
    : Promise.all([import("../../../content/words.en.json"), import("../../../content/texts.en.json")]).then(([w, t]) => ({ words: w.default as string[], texts: t.default.map((p) => p.text) }));

export function LessonRunner({ lang, lessonId, d }: { lang: Lang; lessonId: string; d: Dict }) {
  const lesson = getLesson(lang, lessonId)!;
  const [attempt, setAttempt] = useState(1);
  const [exercises, setExercises] = useState<string[] | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<ExerciseStats[]>([]);
  const coarse = useCoarsePointer();

  useEffect(() => {
    let alive = true;
    loadMaterial(lang).then(({ words, texts }) => {
      if (!alive) return;
      const ex = lesson.kind === "text" ? [texts[Math.floor(Math.random() * texts.length)]] : generateExercises(lang, lessonId, words, attempt);
      setExercises(ex);
      setStep(0);
      setDone([]);
    });
    return () => { alive = false; };
  }, [lang, lessonId, lesson.kind, attempt]);

  const finished = exercises !== null && done.length === exercises.length;
  const target = targetCpm(lesson.index);
  const lessons = lessonsFor(lang);
  const next = lessons[lesson.index + 1];
  const unit = lang === "ru" ? "cpm" : "wpm";
  const show = (cpm: number) => (unit === "wpm" ? Math.round(cpm / 5) : cpm);

  const sum = done.reduce((a, x) => ({ correct: a.correct + x.correct, keys: a.keys + x.keys, errors: a.errors + x.errors, ms: a.ms + x.ms }), { correct: 0, keys: 0, errors: 0, ms: 0 });
  const missed: Record<string, number> = {};
  for (const x of done) for (const [ch, n] of Object.entries(x.missed)) missed[ch] = (missed[ch] ?? 0) + n;
  const cpm = speed(sum.correct, sum.ms, "cpm");
  const acc = accuracyOf(sum.keys, sum.errors);
  const total = { ...sum, missed, cpm, acc, stars: gradeLesson(acc, cpm, target) };

  useRecordOnDone(finished, () => ({
    mode: "lesson", lang, cpm: total.cpm, accuracy: total.acc, errors: total.errors, durationMs: Math.round(total.ms),
    chars: total.correct, lessonId, stars: total.stars, missed: total.missed, input: coarse ? "phone" : "keys",
  }));

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{d.lessonWord} {lesson.index + 1}: {lessonTitle(lesson, d)}</h1>
        <span className={styles.step} data-testid="exercise-step">
          {exercises ? `${d.exercise} ${Math.min(step + 1, exercises.length)} ${d.of} ${exercises.length}` : d.loading} · {d.target} {show(target)} {d.unit}
        </span>
      </div>
      {finished ? (
        <Device glowCpm={total.cpm} screen={
          <div className={styles.result} data-testid="lesson-result">
            <h2>{total.stars > 0 ? d.lessonPassed : d.lessonFailed}</h2>
            <div className={styles.bigStars} data-testid="lesson-stars" data-stars={total.stars}><Stars n={total.stars} /></div>
            <div className={styles.facts}>
              <div><b>{show(total.cpm)}</b><span>{d.unit}</span></div>
              <div><b>{total.acc}%</b><span>{d.accuracy}</span></div>
              <div><b>{total.errors}</b><span>{d.errors}</span></div>
            </div>
            {total.stars === 0 && <p className={styles.need}>{d.lessonNeed} {show(target)} {d.unit}.</p>}
            <div className={styles.actions}>
              <KeyButton onClick={() => setAttempt((a) => a + 1)}>{d.retry}</KeyButton>
              {next && <KeyLink href={`/${lang}/course/${next.id}`} accent>{d.nextLesson}</KeyLink>}
              <KeyLink href={`/${lang}/course`}>{d.toCourse}</KeyLink>
            </div>
          </div>
        } />
      ) : exercises ? (
        <Exercise
          key={`${attempt}:${step}`}
          text={exercises[step]}
          lang={lang}
          d={d}
          focusKeys={lesson.keys}
          onDone={(s) => { setDone((xs) => [...xs, s]); setStep((i) => i + 1); }}
          onRestart={() => setAttempt((a) => a + 1)}
        />
      ) : (
        <Device glowCpm={0} screen={<div className={`${tstyles.viewport} ${tstyles.text}`} />} />
      )}
      <p className={styles.intro}><Link href={`/${lang}/course`}>← {d.toCourse}</Link></p>
    </>
  );
}

function Exercise({ text, lang, d, focusKeys, onDone, onRestart }: { text: string; lang: Lang; d: Dict; focusKeys: string[]; onDone: (s: ExerciseStats) => void; onRestart: () => void }) {
  const engine = useMemo<Engine<TextState>>(() => ({
    create: () => createTextState(text),
    apply: applyTextKey,
    complete: isTextComplete,
    correct: textCorrectChars,
    keys: (s) => s.keys,
    errors: (s) => s.errors,
  }), [text]);
  const session = useTypingSession(engine, lang === "ru" ? "cpm" : "wpm");
  const capture = useCaptureInput({ onKey: session.onKey, onRestart, done: session.done, editor: false });
  const { focus } = capture;
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body) focus();
  }, [focus]);
  useEffect(() => {
    if (!session.done) return;
    const t = setTimeout(() => onDone({ correct: textCorrectChars(session.state), keys: session.state.keys, errors: session.state.errors, ms: session.elapsedMs, missed: session.state.missed }), 350);
    return () => clearTimeout(t);
    // report once when finished
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.done]);

  const marks = useMemo(() => textMarks(session.state), [session.state]);
  const nextCh = text[session.state.buf.length];
  const hint = nextCh !== undefined ? keyFor(nextCh, lang) : null;
  const finger = nextCh !== undefined ? fingerFor(nextCh, lang) : null;
  const fingerNames = d.fingers.split("|");
  return (
    <>
      <Device
        glowCpm={session.cpm}
        screen={
          <div data-testid="stage" onMouseDown={(e) => { e.preventDefault(); capture.focus(); }}>
            <textarea className={tstyles.capture} {...capture.props} />
            <TextWindow marks={marks} idle={!session.started} />
            <button type="button" className={tstyles.veil} data-on={(!capture.focused && !session.done) || undefined} data-testid="focus-veil" onClick={capture.focus} tabIndex={-1}>
              <span>{d.focusVeil}</span>
            </button>
          </div>
        }
      >
        <Readout speed={session.speed} accuracy={session.accuracy} seconds={session.elapsedMs / 1000}
          progress={session.state.buf.length / Math.max(1, text.length)}
          labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, progress: d.progress }} />
        <p className={styles.finger} data-testid="finger-hint">
          {nextCh !== undefined && (
            <>
              {d.nextKey}: <b>{nextCh === " " ? d.space : nextCh}</b>
              {" — "}
              {nextCh === " " ? d.thumb : finger !== null ? fingerNames[finger] : ""}
              {hint?.shift ? `, ${d.withShift}` : ""}
            </>
          )}
        </p>
        <Keyboard press={session.press} primary={lang} hint={hint} fingers focus={focusKeys} />
      </Device>
    </>
  );
}
