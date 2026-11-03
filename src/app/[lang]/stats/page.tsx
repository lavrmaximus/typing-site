import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { StatsPage } from "@/ui/stats/StatsPage";

export default async function Page({ params }: PageProps<"/[lang]/stats">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="stats">
      <StatsPage lang={lang} d={getDict(lang)} />
    </Shell>
  );
}
