"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { phoneView } from "@/engine/phone";
import { applyTextKey, createTextState, isTextComplete, textMarks, type TextState } from "@/engine/text";
import { textCorrectChars } from "@/engine/metrics";
import type { Key } from "@/engine/types";
import type { Passage, WordCount } from "@/content/load";
import type { Dict, Lang } from "@/i18n/dict";
import { Device } from "../Device";
import { KeyButton } from "../KeyCap";
import { Keyboard } from "../Keyboard";
import { Readout } from "../Readout";
import { usePrefs } from "../usePrefs";
import { useCoarsePointer } from "../useCoarsePointer";
import { Hints } from "./Hints";
import { ResultPanel } from "./ResultPanel";
import { TextWindow } from "./TextWindow";
import { useCaptureInput } from "./useCaptureInput";
import { useTypingSession, type Engine } from "./useTypingSession";
import styles from "./Typing.module.css";

interface Content { passages: Passage[]; words: string[] }
const loadContent = (lang: Lang): Promise<Content> =>
  lang === "ru"
    ? Promise.all([import("../../../content/texts.ru.json"), import("../../../content/words.ru.json")]).then(([p, w]) => ({ passages: p.default, words: w.default }))
    : Promise.all([import("../../../content/texts.en.json"), import("../../../content/words.en.json")]).then(([p, w]) => ({ passages: p.default, words: w.default }));

const randomIndex = (n: number, except = -1) => {
  if (n <= 1) return 0;
  let i = except;
  while (i === except) i = Math.floor(Math.random() * n);
  return i;
};

function sampleWords(words: string[], n: number): string {
  const pool = [...words];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).join(" ");
}

type Target = { text: string; passage: Passage | null };

export function TextTrainer({ lang, d }: { lang: Lang; d: Dict }) {
  const [prefs, setPrefs] = usePrefs();
  const coarse = useCoarsePointer();
  const phone = prefs.phone ?? coarse;
  const [content, setContent] = useState<Content | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [attempt, setAttempt] = useState(0);

  const next = (c: Content, kind = prefs.textKind, count: WordCount = prefs.wordCount, currentId?: string) => {
    if (kind === "words") {
      setTarget({ text: sampleWords(c.words, count), passage: null });
    } else {
      const current = currentId ? c.passages.findIndex((p) => p.id === currentId) : -1;
      const p = c.passages[randomIndex(c.passages.length, current)];
      setTarget({ text: p.text, passage: p });
    }
    setAttempt((a) => a + 1);
  };

  useEffect(() => {
    let alive = true;
    loadContent(lang).then((c) => {
      if (!alive) return;
      setContent(c);
      const wanted = new URLSearchParams(location.search).get("passage");
      const i = wanted ? c.passages.findIndex((p) => p.id === wanted) : -1;
      if (i >= 0) {
        setTarget({ text: c.passages[i].text, passage: c.passages[i] });
      } else {
        next(c);
      }
    });
    return () => { alive = false; };
    // content is loaded once per language; `next` reads the saved prefs at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const choose = (patch: { kind?: "lit" | "words"; count?: WordCount }) => {
    const kind = patch.kind ?? prefs.textKind;
    const count = patch.count ?? prefs.wordCount;
    setPrefs({ textKind: kind, wordCount: count });
    if (content) next(content, kind, count, target?.passage?.id);
  };

  const hints: Array<[string, string]> = phone
    ? [["Autocorrect", d.hintAutocorrect], ["Swipe", d.hintSwipe], ["Space", d.hintSpaceWord]]
    : [["Backspace", d.hintFix], ["Ctrl+Backspace", d.hintWord], ["Esc", d.hintEsc]];

  return (
    <>
      <div className={styles.bar}>
        <div className={styles.controls}>
          <KeyButton pressed={prefs.textKind === "lit"} onClick={() => choose({ kind: "lit" })}>{d.literature}</KeyButton>
          <KeyButton pressed={prefs.textKind === "words"} onClick={() => choose({ kind: "words" })}>{d.words}</KeyButton>
          {prefs.textKind === "words" && ([25, 50, 100] as const).map((n) => (
            <KeyButton key={n} pressed={prefs.wordCount === n} onClick={() => choose({ count: n })}>{n}</KeyButton>
          ))}
        </div>
        <div className={styles.controls}>
          {!phone && <KeyButton pressed={prefs.keyboard} onClick={() => setPrefs({ keyboard: !prefs.keyboard })}>{d.keyboardToggle}</KeyButton>}
          <KeyButton pressed={phone} onClick={() => setPrefs({ phone: !phone })}>{d.phoneInput}</KeyButton>
          <KeyButton onClick={() => content && next(content, prefs.textKind, prefs.wordCount, target?.passage?.id)} disabled={!content}>{d.anotherText} ↻</KeyButton>
        </div>
      </div>
      {target ? (
        phone
          ? <PhoneSession key={`p:${attempt}:${target.text}`} text={target.text} lang={lang} d={d} capitalize={prefs.textKind === "lit"} onRestart={() => setAttempt((a) => a + 1)} />
          : <KeySession key={`k:${attempt}:${target.text}`} text={target.text} lang={lang} d={d} keyboard={prefs.keyboard} onRestart={() => setAttempt((a) => a + 1)} />
      ) : (
        <Device glowCpm={0} screen={<div className={`${styles.viewport} ${styles.text}`} />} />
      )}
      <div className={styles.source} data-testid="source">
        {target?.passage ? (
          <>{d.sourceOf}: <a href={target.passage.url} target="_blank" rel="noreferrer">{target.passage.author}, «{target.passage.work}»</a></>
        ) : target ? "FrequencyWords (CC BY-SA 4.0)" : null}
      </div>
      <Hints items={hints} />
    </>
  );
}

const CYR = /[а-яё]/i;
const LAT = /[a-z]/i;

function KeySession({ text, lang, d, keyboard, onRestart }: { text: string; lang: Lang; d: Dict; keyboard: boolean; onRestart: () => void }) {
  const engine = useMemo<Engine<TextState>>(() => ({
    create: () => createTextState(text),
    apply: applyTextKey,
    complete: isTextComplete,
    correct: textCorrectChars,
    keys: (s) => s.keys,
    errors: (s) => s.errors,
  }), [text]);
  const session = useTypingSession(engine, lang === "ru" ? "cpm" : "wpm");
  const [toast, setToast] = useState(false);
  const lastToast = useRef(0);
  const onKey = (k: Key) => {
    if (k.kind === "char") {
      const want = text[session.state.buf.length] ?? "";
      const wrongLayout = (CYR.test(want) && LAT.test(k.ch)) || (LAT.test(want) && CYR.test(k.ch));
      const now = Date.now();
      if (wrongLayout && now - lastToast.current > 3000) {
        lastToast.current = now;
        setToast(true);
        setTimeout(() => setToast(false), 2600);
      }
    }
    session.onKey(k);
  };
  const capture = useCaptureInput({ onKey, onRestart, done: session.done, editor: false });
  const { focus } = capture;
  // take focus on start, unless the visitor has already put it somewhere else
  useEffect(() => {
    const a = document.activeElement;
    if (!a || a === document.body) focus();
  }, [focus]);
  const marks = useMemo(() => textMarks(session.state), [session.state]);

  return (
    <>
      <Device
        glowCpm={session.cpm}
        screen={
          <div data-testid="stage" onMouseDown={(e) => { e.preventDefault(); capture.focus(); }}>
            <textarea className={styles.capture} {...capture.props} />
            <TextWindow marks={marks} idle={!session.started} />
            <button type="button" className={styles.veil} data-on={(!capture.focused && !session.done) || undefined} data-testid="focus-veil" onClick={capture.focus} tabIndex={-1}>
              <span>{d.focusVeil}</span>
            </button>
            {session.done && <Result session={session} d={d} onAgain={onRestart} />}
          </div>
        }
      >
        <Readout speed={session.speed} accuracy={session.accuracy} seconds={session.elapsedMs / 1000}
          progress={session.state.buf.length / Math.max(1, text.length)}
          labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, progress: d.progress }} />
        {keyboard && <Keyboard press={session.press} />}
      </Device>
      <div className={styles.toast} data-on={toast || undefined} data-testid="toast" role="status" aria-live="polite">
        {toast ? d.layoutWarning : ""}
      </div>
    </>
  );
}

interface PhoneState { target: string; field: string }

/** The invisible field must always be typed at its end: a tap elsewhere would splice words mid-text. */
const caretToEnd = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  const n = el.value.length;
  if (el.selectionStart !== n || el.selectionEnd !== n) el.setSelectionRange(n, n);
};

function PhoneSession({ text, lang, d, capitalize, onRestart }: { text: string; lang: Lang; d: Dict; capitalize: boolean; onRestart: () => void }) {
  const engine = useMemo<Engine<PhoneState>>(() => ({
    create: () => ({ target: text, field: "" }),
    apply: (s) => s,
    complete: (s) => phoneView(s.target, s.field).done,
    correct: (s) => phoneView(s.target, s.field).correctChars,
    keys: (s) => phoneView(s.target, s.field).committed,
    errors: (s) => phoneView(s.target, s.field).wrongWords,
  }), [text]);
  const session = useTypingSession(engine, lang === "ru" ? "cpm" : "wpm");
  const field = useRef<HTMLTextAreaElement>(null);
  const view = useMemo(() => phoneView(text, session.state.field), [text, session.state.field]);
  useEffect(() => { if (session.done) field.current?.blur(); }, [session.done]);
  useEffect(() => {
    const onSel = () => { if (document.activeElement === field.current) caretToEnd(field.current); };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  return (
    <Device
      glowCpm={session.cpm}
      screen={
        <div data-testid="stage">
          <TextWindow marks={view.marks} idle={!session.started} />
          {!session.done && (
            <textarea
              ref={field}
              className={styles.phoneField}
              data-testid="phone-input"
              aria-label={d.phoneInput}
              autoCorrect="on"
              autoCapitalize={capitalize ? "sentences" : "none"}
              onFocus={(e) => caretToEnd(e.currentTarget)}
              onPointerUp={(e) => { const el = e.currentTarget; requestAnimationFrame(() => caretToEnd(el)); }}
              onSelect={(e) => caretToEnd(e.currentTarget)}
              autoComplete="on"
              spellCheck
              onInput={(e) => {
                const value = e.currentTarget.value;
                session.replace((s) => (s.field === value ? s : { ...s, field: value }));
              }}
            />
          )}
          {session.done && <Result session={session} d={d} onAgain={onRestart} />}
        </div>
      }
    >
      <Readout speed={session.speed} accuracy={session.accuracy} seconds={session.elapsedMs / 1000}
        progress={view.committed / Math.max(1, text.split(" ").length)}
        labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, progress: d.progress }} />
    </Device>
  );
}

function Result({ session, d, onAgain }: { session: ReturnType<typeof useTypingSession<never>> | { speed: number; accuracy: number; elapsedMs: number; errors: number; samples: number[] }; d: Dict; onAgain: () => void }) {
  return (
    <ResultPanel
      speed={session.speed}
      accuracy={session.accuracy}
      seconds={session.elapsedMs / 1000}
      errors={session.errors}
      samples={session.samples}
      labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, errors: d.errors, again: d.again }}
      onAgain={onAgain}
    />
  );
}
