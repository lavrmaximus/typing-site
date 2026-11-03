import type { Lesson } from "@/course/lessons";
import type { Dict } from "@/i18n/dict";

export function lessonTitle(l: Lesson, d: Dict): string {
  if (l.kind === "shift") return d.lessonShift;
  if (l.kind === "punctuation") return d.lessonPunctuation;
  if (l.kind === "digits") return d.lessonDigits;
  if (l.kind === "text") return d.lessonText;
  return l.keys.map((k) => k.toUpperCase()).join(" ");
}

export const groupTitle = (g: Lesson["group"], d: Dict) =>
  ({ home: d.groupHome, top: d.groupTop, bottom: d.groupBottom, extra: d.groupExtra })[g];
