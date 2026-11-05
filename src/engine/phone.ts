import type { Mark } from "./types";

export interface PhoneView {
  marks: Mark[];
  /** words finished with a space */
  committed: number;
  wrongWords: number;
  correctChars: number;
  done: boolean;
}

/** Phone keyboards swap е and ё on their own (autocorrect, suggestions), so the two count as one letter. */
const fold = (ch: string) => (ch === "ё" ? "е" : ch === "Ё" ? "Е" : ch);
const sameChar = (a: string, b: string) => fold(a) === fold(b);
const sameWord = (a: string, b: string) => a.length === b.length && [...a].every((ch, i) => sameChar(ch, b[i]));

/**
 * Phone input: the text field's value is the source of truth (autocorrect and
 * swipe typing rewrite it freely). Finished words are judged whole; the word
 * being typed is compared letter by letter.
 */
export function phoneView(target: string, field: string): PhoneView {
  const want = target.split(" ");
  const value = field.replace(/^\s+/, "");
  const parts = value ? value.split(/\s+/) : [""];
  const finished = parts.slice(0, -1);
  const current = parts[parts.length - 1];
  const marks: Mark[] = [];
  let wrongWords = 0;
  let correctChars = 0;

  want.forEach((w, i) => {
    if (i < finished.length) {
      const ok = sameWord(finished[i], w);
      if (ok) correctChars += w.length + 1;
      else wrongWords++;
      [...w].forEach((ch, j) => {
        const mark: Mark = { status: ok ? "ok" : "err", ch };
        if (!ok && j === 0) mark.typedWord = finished[i];
        marks.push(mark);
      });
    } else if (i === finished.length) {
      [...w].forEach((ch, j) => {
        const mark: Mark =
          j >= current.length
            ? { status: "todo", ch }
            : sameChar(current[j], ch)
              ? { status: "ok", ch }
              : { status: "err", ch: current[j], expected: ch };
        if (j < current.length && sameChar(current[j], ch)) correctChars++;
        if (j === current.length) mark.caret = true;
        marks.push(mark);
      });
      for (const ch of current.slice(w.length)) marks.push({ status: "extra", ch });
      if (current.length >= w.length) {
        if (i < want.length - 1) { marks.push({ status: "todo", ch: " ", caret: true }); return; }
      }
    } else {
      for (const ch of w) marks.push({ status: "todo", ch });
    }
    if (i < want.length - 1) marks.push({ status: i < finished.length ? "ok" : "todo", ch: " " });
  });

  const done =
    finished.length >= want.length ||
    (finished.length === want.length - 1 && sameWord(current, want[want.length - 1]));
  return { marks, committed: Math.min(finished.length, want.length), wrongWords, correctChars, done };
}
