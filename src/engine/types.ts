export type Key =
  | { kind: "char"; ch: string }
  | { kind: "enter"; ctrl: boolean }
  | { kind: "backspace"; word: boolean }
  | { kind: "tab" }
  | { kind: "end" };

export type TokenKind = "kw" | "str" | "num" | "fn" | "com" | "bi" | "";

export interface TokenInfo {
  kind: TokenKind;
  /** true only for the quote characters that open or close a string literal */
  delimiter: boolean;
}

export interface Mark {
  status: "ok" | "err" | "todo" | "extra";
  /** what is drawn in the slot: the typed char for ok/err/extra, the sample char for todo */
  ch: string;
  /** for err: the sample char that was expected */
  expected?: string;
  token?: TokenKind;
  caret?: true;
  /** phone mode: what the keyboard produced for a wrong word (on its first mark) */
  typedWord?: string;
}

export interface LineView {
  index: number;
  marks: Mark[];
  /** auto-inserted closers still ahead of the caret, drawn after the line */
  ghosts: string;
  current: boolean;
  /** a line that does not exist in the sample */
  extra: boolean;
}

/** Spaces are drawn as a visible glyph wherever they are part of a mistake. */
export const visible = (ch: string) => (ch === " " ? "␣" : ch);
