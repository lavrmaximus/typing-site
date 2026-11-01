import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { TextTrainer } from "@/ui/typing/TextTrainer";

export default async function Page({ params }: PageProps<"/[lang]/text">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="text">
      <TextTrainer lang={lang} d={getDict(lang)} />
    </Shell>
  );
}
