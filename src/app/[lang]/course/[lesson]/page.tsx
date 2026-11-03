import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLesson, lessonsFor } from "@/course/lessons";
import { LANGS, getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { LessonRunner } from "@/ui/course/LessonRunner";
import { lessonTitle } from "@/ui/course/lessonTitle";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => lessonsFor(lang).map((l) => ({ lang, lesson: l.id })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/course/[lesson]">): Promise<Metadata> {
  const { lang, lesson } = await params;
  if (!isLang(lang)) return {};
  const l = getLesson(lang, lesson);
  const d = getDict(lang);
  return l ? { title: `${d.lessonWord} ${l.index + 1}: ${lessonTitle(l, d)} · ${d.courseTitle}` } : {};
}

export default async function Page({ params }: PageProps<"/[lang]/course/[lesson]">) {
  const { lang, lesson } = await params;
  if (!isLang(lang) || !getLesson(lang, lesson)) notFound();
  return (
    <Shell lang={lang} mode="course">
      <LessonRunner lang={lang} lessonId={lesson} d={getDict(lang)} />
    </Shell>
  );
}
