import { applyCodeKey, type CodeState } from "./code";

const currentLine = (s: CodeState) => s.buf.slice(s.buf.lastIndexOf("\n") + 1);

/**
 * Type a program the way a person in an editor would: rely on auto-indent,
 * Backspace down (or space up) to the wanted indent, type the stripped line,
 * press Enter. Used by tests and by the content build to prove every snippet
 * can be finished without a single error.
 */
export function typeLikeHuman(s: CodeState, src: string): CodeState {
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    const want = line.match(/^ */)![0].length;
    if (line.trim()) {
      let cur = currentLine(s).length;
      while (cur > want) {
        s = applyCodeKey(s, { kind: "backspace", word: false });
        cur = currentLine(s).length;
      }
      for (const ch of " ".repeat(want - cur) + line.trim()) s = applyCodeKey(s, { kind: "char", ch });
    }
    if (i < lines.length - 1) s = applyCodeKey(s, { kind: "enter", ctrl: false });
  });
  return s;
}
