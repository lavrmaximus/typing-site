import type { TokenInfo, TokenKind } from "./types";

const KEYWORDS = new Set(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case".split(" "),
);
const BUILTINS = new Set(
  "abs all any bin bool bytes callable chr dict divmod enumerate filter float format frozenset getattr hasattr hash hex id input int isinstance issubclass iter len list map max min next object oct open ord pow print range repr reversed round set setattr slice sorted str sum super tuple type zip self cls Counter defaultdict deque".split(" "),
);

const STRING = /(?:[rRbBuUfF]{1,2})?("""|'''|"|')/y;

/** Per-character token classes for syntax colouring and quote leniency. */
export function tokenizePython(src: string): TokenInfo[] {
  const out: TokenInfo[] = Array.from({ length: src.length }, () => ({ kind: "" as TokenKind, delimiter: false }));
  const set = (from: number, to: number, kind: TokenKind) => {
    for (let k = from; k < to; k++) out[k] = { kind, delimiter: false };
  };
  let prevWord = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "#") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      set(i, stop, "com");
      i = stop;
      continue;
    }
    STRING.lastIndex = i;
    const sm = /[A-Za-z"']/.test(ch) ? STRING.exec(src) : null;
    if (sm && (ch === '"' || ch === "'" || sm[0].length > sm[1].length)) {
      const quote = sm[1];
      const openStart = i + sm[0].length - quote.length;
      const bodyStart = i + sm[0].length;
      let j = bodyStart;
      let close = -1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (quote.length === 1 && src[j] === "\n") break;
        if (src.startsWith(quote, j)) { close = j; break; }
        j++;
      }
      const end = close === -1 ? j : close + quote.length;
      set(i, end, "str");
      for (let k = openStart; k < bodyStart; k++) out[k] = { kind: "str", delimiter: true };
      if (close !== -1) for (let k = close; k < end; k++) out[k] = { kind: "str", delimiter: true };
      i = end;
      prevWord = "";
      continue;
    }
    if (/\d/.test(ch) && !/\w/.test(src[i - 1] ?? "")) {
      const m = /\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
      m.lastIndex = i;
      const len = m.exec(src)![0].length;
      set(i, i + len, "num");
      i += len;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /[A-Za-z_]\w*/y;
      m.lastIndex = i;
      const word = m.exec(src)![0];
      let kind: TokenKind = "";
      if (KEYWORDS.has(word)) kind = "kw";
      else if (prevWord === "def" || prevWord === "class") kind = "fn";
      else if (BUILTINS.has(word)) kind = "bi";
      else if (src[i + word.length] === "(") kind = "fn";
      set(i, i + word.length, kind);
      prevWord = word;
      i += word.length;
      continue;
    }
    i++;
  }
  return out;
}
