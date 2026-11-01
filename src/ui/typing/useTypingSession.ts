"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { accuracy, speed, type SpeedUnit } from "@/engine/metrics";
import type { Key } from "@/engine/types";
import type { KeyPress } from "../Keyboard";

export interface Engine<S> {
  create(): S;
  apply(s: S, k: Key): S;
  complete(s: S): boolean;
  correct(s: S): number;
  keys(s: S): number;
  errors(s: S): number;
}

interface Session<S> { s: S; startedAt: number | null; doneAt: number | null; press: KeyPress | null }
type Action = { type: "key"; key: Key; at: number } | { type: "replace"; at: number; mutate: (s: unknown) => unknown };

const pressChar = (k: Key) =>
  k.kind === "char" ? k.ch : k.kind === "enter" ? "\n" : k.kind === "backspace" ? "\b" : k.kind === "tab" ? "\t" : "";

/**
 * Owns one typing attempt: engine state, timing, live metrics and the last
 * key press (for the on-screen keyboard). Remount (React `key`) to restart.
 */
export function useTypingSession<S>(engine: Engine<S>, unit: SpeedUnit) {
  const [st, dispatch] = useReducer(
    (cur: Session<S>, a: Action): Session<S> => {
      if (cur.doneAt) return cur;
      const s = a.type === "key" ? engine.apply(cur.s, a.key) : (a.mutate(cur.s) as S);
      if (s === cur.s) return cur;
      const startedAt = cur.startedAt ?? a.at;
      return {
        s,
        startedAt,
        doneAt: engine.complete(s) ? a.at : null,
        press: a.type === "key" ? { ch: pressChar(a.key), at: a.at } : cur.press,
      };
    },
    null,
    (): Session<S> => ({ s: engine.create(), startedAt: null, doneAt: null, press: null }),
  );

  const [now, setNow] = useState(0);
  const [samples, setSamples] = useState<number[]>([]);
  const latest = useRef(st);
  useEffect(() => { latest.current = st; }, [st]);

  const running = st.startedAt !== null && st.doneAt === null;
  useEffect(() => {
    if (!running) return;
    let ticks = 0;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (++ticks % 4 === 0) {
        const cur = latest.current;
        setSamples((xs) => [...xs, speed(engine.correct(cur.s), t - (cur.startedAt ?? t), "cpm")]);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, engine]);

  const end = st.doneAt ?? (running ? Math.max(now, st.startedAt!) : st.startedAt ?? 0);
  const elapsed = st.startedAt ? end - st.startedAt : 0;
  const correct = engine.correct(st.s);
  const cpm = st.startedAt ? speed(correct, elapsed, "cpm") : 0;

  return {
    state: st.s,
    started: st.startedAt !== null,
    done: st.doneAt !== null,
    elapsedMs: elapsed,
    speed: st.startedAt ? speed(correct, elapsed, unit) : 0,
    cpm,
    accuracy: accuracy(engine.keys(st.s), engine.errors(st.s)),
    errors: engine.errors(st.s),
    samples: st.doneAt ? [...samples, cpm] : samples,
    press: st.press,
    onKey: (key: Key) => dispatch({ type: "key", key, at: Date.now() }),
    /** replace the engine state wholesale (phone mode: the text field is the source of truth) */
    replace: (mutate: (s: S) => S) => dispatch({ type: "replace", at: Date.now(), mutate: mutate as (s: unknown) => unknown }),
  };
}
