/**
 * Validates extracted snippets with the real code engine (each must be finishable
 * with zero errors by an editor-style typist) and picks a varied set.
 * Input: .cache/snippets.raw.json (from extract_snippets.py). Output: content/snippets.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createCodeState, isCodeComplete } from "../../src/engine/code";
import { typeLikeHuman } from "../../src/engine/simulate";

interface Snippet { id: string; path: string; url: string; code: string }
const MAX = 400;

const raw: Snippet[] = JSON.parse(readFileSync(".cache/snippets.raw.json", "utf8"));
const ok = raw.filter((s) => {
  const st = typeLikeHuman(createCodeState(s.code), s.code);
  return isCodeComplete(st) && st.errors === 0;
});

// Round-robin across top-level folders so every topic is represented.
const groups = new Map<string, Snippet[]>();
for (const s of ok) {
  const g = s.path.split("/")[0];
  groups.set(g, [...(groups.get(g) ?? []), s]);
}
const picked: Snippet[] = [];
while (picked.length < MAX && [...groups.values()].some((g) => g.length)) {
  for (const g of groups.values()) if (g.length && picked.length < MAX) picked.push(g.shift()!);
}
writeFileSync("content/snippets.json", JSON.stringify(picked, null, 1) + "\n");
console.log(`raw ${raw.length}, typeable ${ok.length}, picked ${picked.length} from ${groups.size} folders`);
