/**
 * Builds content/words.{ru,en}.json: the 1000 most frequent words of each language.
 * Source: hermitdave/FrequencyWords (OpenSubtitles 2018), CC-BY-SA 4.0.
 * Run: npm run content:words
 */
import { writeFileSync } from "node:fs";

const SRC = (l: string) => `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`;
const LETTERS = { ru: /^[а-яё]{2,}$/, en: /^[a-z]{2,}$/ };

// Profanity and slurs. Exact words plus a few unambiguous stems.
const BLOCK = {
  ru: {
    exact: new Set("сука суки сучка блин бля блять блядь мудак мудаки дерьмо жопа жопу говно срать шлюха шлюхи трахать трахнуть хрен херня член пидор козел козёл ублюдок сволочь".split(" ")),
    stems: ["хуй", "хуе", "хуё", "хуя", "хуи", "пизд", "ебат", "ебан", "ебал", "ебу", "заеб", "наеб", "уеб", "выеб", "отъеб", "нахуй", "бляд", "пидор", "ублюд"],
  },
  en: {
    exact: new Set("ass asses asshole bitch bitches bastard crap damn dick dicks cock pussy whore slut cunt fag faggot nigga nigger sex sexy hell piss".split(" ")),
    stems: ["fuck", "shit", "motherf", "bullsh"],
  },
};

async function build(lang: "ru" | "en") {
  const res = await fetch(SRC(lang));
  if (!res.ok) throw new Error(`${res.status} ${SRC(lang)}`);
  const words: string[] = [];
  for (const line of (await res.text()).split("\n")) {
    const w = line.split(" ")[0]?.trim().toLowerCase();
    if (!w || !LETTERS[lang].test(w)) continue;
    if (BLOCK[lang].exact.has(w) || BLOCK[lang].stems.some((s) => w.startsWith(s))) continue;
    if (!words.includes(w)) words.push(w);
    if (words.length === 1000) break;
  }
  writeFileSync(`content/words.${lang}.json`, JSON.stringify(words) + "\n");
  console.log(`${lang}: ${words.length} words`);
}

Promise.all([build("ru"), build("en")]);
