import { notFound } from "next/navigation";
import { isLang } from "@/i18n/dict";
import { StartRedirect } from "@/ui/StartRedirect";

export default async function LangStart({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <>
      <StartRedirect lang={lang} />
      <noscript><a href={`/${lang}/code`}>{lang === "ru" ? "Перейти к тренажёру" : "Open the trainer"}</a></noscript>
    </>
  );
}
