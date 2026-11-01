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
