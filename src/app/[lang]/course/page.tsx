import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { CourseList } from "@/ui/course/CourseList";

export default async function Page({ params }: PageProps<"/[lang]/course">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="course">
      <CourseList lang={lang} d={getDict(lang)} />
    </Shell>
  );
}
