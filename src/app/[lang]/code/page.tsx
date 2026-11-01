import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { CodeTrainer } from "@/ui/typing/CodeTrainer";

export default async function Page({ params }: PageProps<"/[lang]/code">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="code">
      <CodeTrainer lang={lang} d={getDict(lang)} />
    </Shell>
  );
}
