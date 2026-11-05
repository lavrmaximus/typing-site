import type { Lang } from "@/i18n/dict";

export type ResultMode = "code" | "lit" | "words" | "lesson";
export const RESULT_MODES: ResultMode[] = ["code", "lit", "words", "lesson"];

/** Physical keyboard or a phone's on-screen one: speeds on the two are not comparable. */
export type ResultInput = "keys" | "phone";
/** Results saved before the split carry no input kind; they were typed on keys. */
export const inputOf = (r: Pick<Result, "input">): ResultInput => r.input ?? "keys";

/** One finished attempt, as stored by the API (and in the guest queue). */
export interface Result {
  at: number;
  mode: ResultMode;
  lang: Lang;
  /** chars per minute, whatever unit the page displayed */
  cpm: number;
  accuracy: number;
  errors: number;
  durationMs: number;
  chars: number;
  contentId?: string | null;
  lessonId?: string | null;
  stars?: number | null;
  /** expected character -> times mistyped */
  missed: Record<string, number>;
  input?: ResultInput;
}

export interface Me {
  id: number;
  username: string;
  hasPassword: boolean;
  telegram: { id: number; username: string | null } | null;
}
