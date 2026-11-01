import type { TokenInfo } from "./types";

const WORD = /\w/;

/**
 * A space in the sample may be skipped when removing it would not glue two
 * word characters together (e.g. around "=", after ","). Never inside
 * strings, comments or the leading indentation.
 * `tokens` are the token infos for this line only (same length as `line`).
 */
export function isOptionalSpace(line: string, col: number, tokens: TokenInfo[]): boolean {
  if (line[col] !== " ") return false;
  if (!line.slice(0, col).trim()) return false;
  const kind = tokens[col]?.kind;
  if (kind === "str" || kind === "com") return false;
  let l = col - 1;
  while (l >= 0 && line[l] === " ") l--;
  let r = col + 1;
  while (r < line.length && line[r] === " ") r++;
  if (l < 0 || r >= line.length) return false;
  return !(WORD.test(line[l]) && WORD.test(line[r]));
}

const QUOTE = /^["']$/;

/** Exact match, or ' and " standing in for each other at a string boundary. */
export function charsMatch(typed: string, expected: string, delimiter: boolean): boolean {
  if (typed === expected) return true;
  return delimiter && QUOTE.test(typed) && QUOTE.test(expected);
}
