import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { IdleStage } from "@/ui/Stage";

export default async function Page({ params }: PageProps<"/[lang]/code">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="code">
      <IdleStage d={getDict(lang)} />
    </Shell>
  );
}
