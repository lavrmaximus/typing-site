import { visible, type Key, type Mark } from "./types";

export interface TextState {
  target: string;
  buf: string;
  keys: number;
  errors: number;
}

export const createTextState = (target: string): TextState => ({ target, buf: "", keys: 0, errors: 0 });

export function applyTextKey(s: TextState, key: Key): TextState {
  if (key.kind === "char") {
    if (s.buf.length >= s.target.length) return s;
    const wrong = key.ch !== s.target[s.buf.length];
    return { ...s, buf: s.buf + key.ch, keys: s.keys + 1, errors: s.errors + (wrong ? 1 : 0) };
  }
  if (key.kind === "backspace") {
    if (!s.buf) return s;
    const buf = key.word ? s.buf.replace(/(\S+\s*|\s+)$/, "") : s.buf.slice(0, -1);
    return { ...s, buf };
  }
  return s;
}

export function textMarks(s: TextState): Mark[] {
  return [...s.target].map((t, i): Mark => {
    const mark: Mark =
      i >= s.buf.length
        ? { status: "todo", ch: t }
        : s.buf[i] === t
          ? { status: "ok", ch: t }
          : { status: "err", ch: visible(s.buf[i]), expected: visible(t) };
    if (i === s.buf.length) mark.caret = true;
    return mark;
  });
}

export const isTextComplete = (s: TextState) => s.buf === s.target;
