import { charsMatch, isOptionalSpace } from "./leniency";
import { tokenizePython } from "./python-tokens";
import { visible, type Key, type LineView, type Mark, type TokenInfo } from "./types";

export interface CodeState {
  target: string;
  /** text before the caret */
  buf: string;
  /** auto-inserted text after the caret (closing brackets / quotes) */
  pending: string;
  keys: number;
  errors: number;
  /** sample character -> how many times it was mistyped */
  missed: Record<string, number>;
}

const PAIRS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSERS = new Set([")", "]", "}"]);
const QUOTES = new Set(['"', "'"]);
const INDENT = 4;

export const createCodeState = (target: string): CodeState => ({ target, buf: "", pending: "", keys: 0, errors: 0, missed: {} });

const lastLine = (buf: string) => buf.slice(buf.lastIndexOf("\n") + 1);

interface SampleLine { text: string; tokens: TokenInfo[] }
const sampleCache = new Map<string, SampleLine[]>();

/** The sample split into lines, each with its own token infos (memoised per target). */
function sampleLines(target: string): SampleLine[] {
  let lines = sampleCache.get(target);
  if (!lines) {
    const tokens = tokenizePython(target);
    let offset = 0;
    lines = target.split("\n").map((text) => {
      const line = { text, tokens: tokens.slice(offset, offset + text.length) };
      offset += text.length + 1;
      return line;
    });
    if (sampleCache.size > 200) sampleCache.clear();
    sampleCache.set(target, lines);
  }
  return lines;
}

const matchesAt = (sample: SampleLine | undefined, col: number, typed: string) =>
  !!sample && col < sample.text.length && charsMatch(typed, sample.text[col], sample.tokens[col].delimiter);

export function codeCursor(s: CodeState): { line: number; col: number } {
  const lines = s.buf.split("\n");
  return { line: lines.length - 1, col: lines[lines.length - 1].length };
}

/** Was the char just written at (line, col) different from the sample? */
function wrongAt(s: CodeState, line: number, col: number): boolean {
  return !matchesAt(sampleLines(s.target)[line], col, lastLine(s.buf)[col]);
}

/** If the caret sits on optional spaces and the typed char is what follows them, fill the spaces in. */
function skipOptionalSpaces(s: CodeState, ch: string): CodeState {
  if (ch === " ") return s;
  const { line, col } = codeCursor(s);
  const sample = sampleLines(s.target)[line];
  if (!sample || !isOptionalSpace(sample.text, col, sample.tokens)) return s;
  if (lastLine(s.buf) !== sample.text.slice(0, col)) return s;
  let end = col;
  while (sample.text[end] === " ") end++;
  if (!matchesAt(sample, end, ch)) return s;
  return { ...s, buf: s.buf + " ".repeat(end - col) };
}

/** Is the end of this (partial) line inside a string literal or a comment? */
function lineContext(line: string): { inString: boolean; inComment: boolean } {
  let open: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (open) {
      if (c === "\\") { i++; continue; }
      if (line.startsWith(open, i)) { i += open.length - 1; open = null; }
    } else if (c === "#") {
      return { inString: false, inComment: true };
    } else if (QUOTES.has(c)) {
      open = line.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
      i += open.length - 1;
    }
  }
  return { inString: open !== null, inComment: false };
}

function typeChar(s: CodeState, ch: string): CodeState {
  s = skipOptionalSpaces(s, ch);
  let { buf, pending } = s;
  if ((CLOSERS.has(ch) || QUOTES.has(ch)) && pending[0] === ch) {
    buf += ch;
    pending = pending.slice(1);
  } else if (PAIRS[ch]) {
    const ctx = lineContext(lastLine(buf));
    buf += ch;
    if (!ctx.inString && !ctx.inComment) pending = PAIRS[ch] + pending;
  } else if (QUOTES.has(ch)) {
    const line = lastLine(buf);
    const ctx = lineContext(line);
    const afterWord = /\w/.test(line.slice(-1));
    buf += ch;
    if (!ctx.inString && !ctx.inComment && !afterWord) pending = ch + pending;
  } else {
    buf += ch;
  }
  const next = { ...s, buf, pending, keys: s.keys + 1 };
  const { line, col } = codeCursor(next);
  if (!wrongAt(next, line, col - 1)) return next;
  const want = s.target.split("\n")[line]?.[col - 1];
  return { ...next, errors: next.errors + 1, missed: want === undefined ? next.missed : { ...next.missed, [want]: (next.missed[want] ?? 0) + 1 } };
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
    // delete char by char so every removed opener takes its auto-closer with it
    const m = buf.match(/(\w+|[ \t]+|\n|[^\w\s])$/);
    const stop = buf.length - (m ? m[0].length : 1);
    let cur = s;
    while (cur.buf.length > stop) cur = backspace(cur, false);
    return cur;
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

const rtrimLines = (text: string) =>
  text
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""));

export function isCodeComplete(s: CodeState): boolean {
  const typed = rtrimLines(s.buf + s.pending);
  const sample = sampleLines(s.target);
  const want = rtrimLines(s.target);
  if (typed.length !== want.length) return false;
  return want.every((w, k) => {
    const t = typed[k];
    if (t.length !== w.length) return false;
    for (let j = 0; j < w.length; j++) if (!matchesAt(sample[k], j, t[j])) return false;
    return true;
  });
}

/** Render model: one entry per line (sample lines plus any extra typed lines). */
export function codeView(s: CodeState, tokens: TokenInfo[]): LineView[] {
  const sample = s.target.split("\n");
  const starts: number[] = [];
  sample.reduce((pos, l) => (starts.push(pos), pos + l.length + 1), 0);
  const docLines = (s.buf + s.pending).split("\n");
  const { line: cur, col } = codeCursor(s);
  const lines = sampleLines(s.target);
  const count = Math.max(sample.length, docLines.length);
  const view: LineView[] = [];
  for (let k = 0; k < count; k++) {
    const t = sample[k];
    const d = docLines[k] ?? "";
    const typed = k < cur ? d.length : k === cur ? col : 0;
    const marks: Mark[] = [];
    const width = Math.max(t?.length ?? 0, typed);
    for (let j = 0; j < width; j++) {
      const tc = t !== undefined && j < t.length ? t[j] : undefined;
      let mark: Mark;
      if (j < typed) {
        if (tc === undefined) mark = { status: "extra", ch: visible(d[j]) };
        else if (matchesAt(lines[k], j, d[j])) mark = { status: "ok", ch: d[j], token: tokens[starts[k] + j]?.kind };
        else mark = { status: "err", ch: visible(d[j]), expected: visible(tc) };
      } else {
        mark = { status: "todo", ch: tc ?? " " };
      }
      if (k === cur && j === col) mark.caret = true;
      marks.push(mark);
    }
    if (k === cur && col >= width) marks.push({ status: "todo", ch: " ", caret: true });
    view.push({
      index: k,
      marks,
      ghosts: k >= cur ? d.slice(typed) : "",
      current: k === cur,
      extra: t === undefined,
    });
  }
  return view;
}
