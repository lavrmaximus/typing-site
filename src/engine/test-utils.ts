import { applyCodeKey, type CodeState } from "./code";
import type { Key } from "./types";

/** Feed text as keystrokes: "\n" is a plain Enter, everything else a char. */
export function type(s: CodeState, text: string): CodeState {
  for (const ch of text) {
    const key: Key = ch === "\n" ? { kind: "enter", ctrl: false } : { kind: "char", ch };
    s = applyCodeKey(s, key);
  }
  return s;
}

export const PROTOTYPE_SNIPPETS = [
  `def binary_search(items: list[int], target: int) -> int:
    """Return index of target in sorted items, or -1."""
    left, right = 0, len(items) - 1
    while left <= right:
        mid = (left + right) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1


if __name__ == "__main__":
    data = [1, 3, 5, 7, 9, 11]
    print(binary_search(data, 7))`,
  `from collections import Counter


def top_words(text: str, n: int = 3) -> list[tuple[str, int]]:
    # split, clean punctuation, count
    words = [w.strip(".,!?").lower() for w in text.split()]
    counts = Counter(w for w in words if w)
    return counts.most_common(n)


if __name__ == "__main__":
    sample = "to be or not to be, that is the question"
    for word, count in top_words(sample):
        print(f"{word}: {count}")`,
];
