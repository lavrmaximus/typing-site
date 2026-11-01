import type { Key } from "./types";

export interface CodeState {
  target: string;
  /** text before the caret */
  buf: string;
  /** auto-inserted text after the caret (closing brackets / quotes) */
  pending: string;
  keys: number;
  errors: number;
}

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = new Set([")", "]", "}"]);
const QUOTES = new Set(['"', "'"]);
const INDENT = 4;

export const createCodeState = (target: string): CodeState => ({ target, buf: "", pending: "", keys: 0, errors: 0 });

const lastLine = (buf: string) => buf.slice(buf.lastIndexOf("\n") + 1);

export function codeCursor(s: CodeState): { line: number; col: number } {
  const lines = s.buf.split("\n");
  return { line: lines.length - 1, col: lines[lines.length - 1].length };
}

/** Was the char just written at (line, col) different from the sample? */
function wrongAt(s: CodeState, line: number, col: number): boolean {
  const t = s.target.split("\n")[line];
  if (t === undefined) return true;
  return lastLine(s.buf)[col] !== t[col];
}

function typeChar(s: CodeState, ch: string): CodeState {
  let { buf, pending } = s;
  if ((CLOSERS.has(ch) || QUOTES.has(ch)) && pending[0] === ch) {
    buf += ch;
    pending = pending.slice(1);
  } else if (PAIRS[ch]) {
    buf += ch;
    pending = PAIRS[ch] + pending;
  } else if (QUOTES.has(ch)) {
    const line = lastLine(buf);
    const insideString = (line.split(ch).length - 1) % 2 === 1;
    const afterWord = /\w/.test(line.slice(-1));
    buf += ch;
    if (!insideString && !afterWord) pending = ch + pending;
  } else {
    buf += ch;
  }
  const next = { ...s, buf, pending, keys: s.keys + 1 };
  const { line, col } = codeCursor(next);
  return wrongAt(next, line, col - 1) ? { ...next, errors: next.errors + 1 } : next;
}

function indentFor(line: string): string {
  const ws = line.match(/^\s*/)![0];
  return line.trimEnd().endsWith(":") ? ws + " ".repeat(INDENT) : ws;
}

function enter(s: CodeState): CodeState {
  let buf = s.buf;
  const line = lastLine(buf);
  let indent: string;
  if (line.length && !line.trim()) {
    buf = buf.slice(0, buf.length - line.length);
    indent = line;
  } else {
    indent = indentFor(line);
  }
  buf += "\n" + indent;
  const newLineIndex = buf.split("\n").length - 1;
  const tooMany = newLineIndex > s.target.split("\n").length - 1;
  return { ...s, buf, keys: s.keys + 1, errors: s.errors + (tooMany ? 1 : 0) };
}

function commitPendingLine(s: CodeState): CodeState {
  const nl = s.pending.indexOf("\n");
  const part = nl === -1 ? s.pending : s.pending.slice(0, nl);
  return { ...s, buf: s.buf + part, pending: s.pending.slice(part.length) };
}

function backspace(s: CodeState, word: boolean): CodeState {
  const { buf, pending } = s;
  if (!buf) return s;
  if (word) {
    const m = buf.match(/(\w+|[ \t]+|\n|[^\w\s])$/);
    return { ...s, buf: buf.slice(0, buf.length - (m ? m[0].length : 1)) };
  }
  const line = lastLine(buf);
  if (line.length && !line.trim()) {
    const cut = line.length % INDENT || INDENT;
    return { ...s, buf: buf.slice(0, -cut) };
  }
  const last = buf.slice(-1);
  const pairedBracket = PAIRS[last] !== undefined && pending[0] === PAIRS[last];
  const pairedQuote = QUOTES.has(last) && pending[0] === last;
  return {
    ...s,
    buf: buf.slice(0, -1),
    pending: pairedBracket || pairedQuote ? pending.slice(1) : pending,
  };
}

export function applyCodeKey(s: CodeState, key: Key): CodeState {
  switch (key.kind) {
    case "char":
      return typeChar(s, key.ch);
    case "enter":
      return enter(key.ctrl ? commitPendingLine(s) : s);
    case "end":
      return commitPendingLine(s);
    case "tab": {
      const n = INDENT - (lastLine(s.buf).length % INDENT);
      return { ...s, buf: s.buf + " ".repeat(n), keys: s.keys + 1 };
    }
    case "backspace":
      return backspace(s, key.word);
  }
}

const normalize = (text: string) =>
  text
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");

export function isCodeComplete(s: CodeState): boolean {
  return normalize(s.buf + s.pending) === normalize(s.target);
}
