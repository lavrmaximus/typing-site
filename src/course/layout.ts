import type { Lang } from "@/i18n/dict";

/** Physical keys by their Latin legend; the Russian legend sits on the same key. */
export const KEY_ROWS = ["`1234567890-=", "qwertyuiop[]", "asdfghjkl;'", "zxcvbnm,./"] as const;
export const RU_ROWS = ["ё1234567890-=", "йцукенгшщзхъ", "фывапролджэ", "ячсмитьбю."] as const;
/** finger per key: 0..3 left pinky..index, 4..7 right index..pinky */
export const FINGER_ROWS = [
  [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7],
  [0, 1, 2, 3, 3, 4, 4, 5, 6, 7],
] as const;

export interface KeyRef { id: string; shift: boolean }

const EN_SHIFTED: Record<string, string> = { "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", "{": "[", "}": "]", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/" };
const RU_SHIFTED: Record<string, string> = { "!": "1", '"': "2", "№": "3", ";": "4", "%": "5", ":": "6", "?": "7", "*": "8", "(": "9", ")": "0", _: "-", "+": "=", ",": "/" };

const finger = new Map<string, number>();
KEY_ROWS.forEach((row, r) => [...row].forEach((k, i) => finger.set(k, FINGER_ROWS[r][i])));
finger.set("space", 4);

const ruKey = new Map<string, string>();
RU_ROWS.forEach((row, r) => [...row].forEach((ch, i) => ruKey.set(ch, KEY_ROWS[r][i])));

/** Which key (and whether Shift) produces `ch` on the given layout. */
export function keyFor(ch: string, lang: Lang = "en"): KeyRef | null {
  if (ch === " ") return { id: "space", shift: false };
  const lower = ch.toLowerCase();
  const upper = ch !== lower;
  if (lang === "ru") {
    if (RU_SHIFTED[ch]) return { id: RU_SHIFTED[ch], shift: true };
    if (ruKey.has(lower)) return { id: ruKey.get(lower)!, shift: upper };
  }
  if (/[а-яё]/.test(lower)) return ruKey.has(lower) ? { id: ruKey.get(lower)!, shift: upper } : null;
  if (EN_SHIFTED[ch]) return { id: EN_SHIFTED[ch], shift: true };
  return finger.has(lower) ? { id: lower, shift: upper } : null;
}

export function fingerFor(ch: string, lang: Lang = "en"): number | null {
  const k = keyFor(ch, lang);
  return k ? (finger.get(k.id) ?? null) : null;
}

export const fingerOfKey = (id: string) => finger.get(id) ?? null;
