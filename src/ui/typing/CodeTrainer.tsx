"use client";

import { useEffect, useMemo, useState } from "react";
import { applyCodeKey, createCodeState, isCodeComplete, type CodeState } from "@/engine/code";
import { codeCorrectChars } from "@/engine/metrics";
import type { Snippet } from "@/content/load";
import type { Dict, Lang } from "@/i18n/dict";
import { Device } from "../Device";
import { KeyButton } from "../KeyCap";
import { Keyboard } from "../Keyboard";
import { Readout } from "../Readout";
import { usePrefs } from "../usePrefs";
import { useCoarsePointer } from "../useCoarsePointer";
import { CodeWindow } from "./CodeWindow";
import { Hints } from "./Hints";
import { ResultPanel } from "./ResultPanel";
import { useCaptureInput } from "./useCaptureInput";
import { useTypingSession, type Engine } from "./useTypingSession";
import { useRecordOnDone } from "./useRecordOnDone";
import styles from "./Typing.module.css";

const loadSnippets = () => import("../../../content/snippets.json").then((m) => m.default as Snippet[]);

function pickRandom(list: Snippet[], except?: string): Snippet {
  const pool = list.length > 1 ? list.filter((s) => s.id !== except) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function CodeTrainer({ lang, d }: { lang: Lang; d: Dict }) {
  const coarse = useCoarsePointer();
  const [prefs, setPrefs] = usePrefs();
  const [snippets, setSnippets] = useState<Snippet[] | null>(null);
  const [snippet, setSnippet] = useState<Snippet | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSnippets().then((list) => {
      if (!alive) return;
      const wanted = new URLSearchParams(location.search).get("snippet");
      setSnippets(list);
      setSnippet(list.find((s) => s.id === wanted) ?? pickRandom(list));
    });
    return () => { alive = false; };
  }, []);

  if (coarse) {
    return (
      <Device glowCpm={0} screen={
        <div className={styles.notice} data-testid="code-needs-keyboard">
          <p>{d.needsKeyboard}</p>
          <a href={`/${lang}/text`} className={styles.file}>{d.toText} →</a>
        </div>
      } />
    );
  }

  return (
    <>
      <div className={styles.bar}>
        {snippet ? (
          <a className={styles.file} href={snippet.url} target="_blank" rel="noreferrer" data-testid="snippet-file" title={d.sourceOf}>
            <i aria-hidden="true" />{snippet.path}
          </a>
        ) : <span className={styles.file}>{d.loading}</span>}
        <div className={styles.controls}>
        <KeyButton pressed={prefs.keyboard} onClick={() => setPrefs({ keyboard: !prefs.keyboard })}>{d.keyboardToggle}</KeyButton>
        <KeyButton
          onClick={() => { if (snippets && snippet) { setSnippet(pickRandom(snippets, snippet.id)); setAttempt((a) => a + 1); } }}
          disabled={!snippets}
        >
          {d.anotherSnippet} ↻
        </KeyButton>
        </div>
      </div>
      {snippet
        ? <CodeSession key={`${snippet.id}:${attempt}`} id={snippet.id} code={snippet.code} lang={lang} d={d} onRestart={() => setAttempt((a) => a + 1)} />
        : <Device glowCpm={0} screen={<div className={`${styles.viewport} ${styles.code}`} />} />}
      <Hints items={[
        ["( [ { \" '", d.hintPairs],
        ["Enter", d.hintEnter],
        ["Ctrl+Enter", d.hintCtrlEnter],
        ["Backspace", d.hintBackspace],
        ["a=b", d.hintSpaces],
        ["Esc", d.hintEsc],
      ]} />
    </>
  );
}

function CodeSession({ id, code, lang, d, onRestart }: { id: string; code: string; lang: Lang; d: Dict; onRestart: () => void }) {
  const engine = useMemo<Engine<CodeState>>(() => ({
    create: () => createCodeState(code),
    apply: applyCodeKey,
    complete: isCodeComplete,
    correct: codeCorrectChars,
    keys: (s) => s.keys,
    errors: (s) => s.errors,
  }), [code]);
  const session = useTypingSession(engine, lang === "ru" ? "cpm" : "wpm");
  const capture = useCaptureInput({ onKey: session.onKey, onRestart, done: session.done, editor: true });
  const [prefs] = usePrefs();
  useRecordOnDone(session.done, () => ({
    mode: "code", lang, cpm: session.cpm, accuracy: session.accuracy, errors: session.errors,
    durationMs: Math.round(session.elapsedMs), chars: codeCorrectChars(session.state), contentId: id, missed: session.state.missed, input: "keys",
  }));
  const { focus } = capture;
  // take focus on start, unless the visitor has already put it somewhere else
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body) focus();
  }, [focus]);

  const progress = Math.min(1, session.state.buf.length / Math.max(1, code.length));
  return (
    <Device
      glowCpm={session.cpm}
      screen={
        <div data-testid="stage" onMouseDown={(e) => { e.preventDefault(); capture.focus(); }}>
          <textarea className={styles.capture} {...capture.props} />
          <CodeWindow state={session.state} idle={!session.started} />
          <button type="button" className={styles.veil} data-on={(!capture.focused && !session.done) || undefined} data-testid="focus-veil" onClick={capture.focus} tabIndex={-1}>
            <span>{d.focusVeil}</span>
          </button>
          {session.done && (
            <ResultPanel
              speed={session.speed}
              accuracy={session.accuracy}
              seconds={session.elapsedMs / 1000}
              errors={session.errors}
              samples={session.samples}
              labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, errors: d.errors, again: d.again }}
              onAgain={onRestart}
            />
          )}
        </div>
      }
    >
      <Readout
        speed={session.speed}
        accuracy={session.accuracy}
        seconds={session.elapsedMs / 1000}
        progress={session.done ? 1 : progress}
        labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, progress: d.progress }}
      />
      {prefs.keyboard && <Keyboard press={session.press} />}
    </Device>
  );
}
