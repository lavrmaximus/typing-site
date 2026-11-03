"use client";

import Link from "next/link";
import { summarize } from "@/account/stats";
import { lessonsFor, type LessonGroup } from "@/course/lessons";
import { targetCpm } from "@/course/grading";
import type { Dict, Lang } from "@/i18n/dict";
import { groupTitle, lessonTitle } from "./lessonTitle";
import { useResults } from "./useResults";
import styles from "./Course.module.css";

const GROUPS: LessonGroup[] = ["home", "top", "bottom", "extra"];

export function Stars({ n }: { n: number }) {
  return <>{[1, 2, 3].map((i) => (i <= n ? <b key={i}>★</b> : <span key={i}>☆</span>))}</>;
}

export function CourseList({ lang, d }: { lang: Lang; d: Dict }) {
  const results = useResults(lang);
  const progress = results ? summarize(results).lessons : {};
  const lessons = lessonsFor(lang);
  const next = lessons.find((l) => !(progress[l.id]?.stars > 0))?.id;
  const unit = lang === "ru" ? 1 : 5;
  return (
    <>
      <h1 className={styles.title}>{d.courseTitle}</h1>
      <p className={styles.intro}>{d.courseIntro}</p>
      {GROUPS.map((g) => (
        <section key={g} className={styles.group}>
          <h2>{groupTitle(g, d)}</h2>
          <div className={styles.grid}>
            {lessons.filter((l) => l.group === g).map((l) => {
              const stars = progress[l.id]?.stars ?? 0;
              return (
                <Link
                  key={l.id}
                  href={`/${lang}/course/${l.id}`}
                  className={styles.card}
                  data-testid="lesson-card"
                  data-recommended={results ? String(l.id === next) : "false"}
                  data-stars={stars}
                >
                  <span className={styles.num}>{d.lessonWord} {l.index + 1}</span>
                  <span className={styles.keys}>{lessonTitle(l, d)}</span>
                  <span className={styles.sub}>{d.target} {Math.round(targetCpm(l.index) / unit)} {d.unit}</span>
                  <span className={styles.stars} aria-label={`${stars}/3`}><Stars n={stars} /></span>
                  {l.id === next && results && <span className={styles.badge}>{d.recommended}</span>}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
