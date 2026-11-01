import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";

export default async function Page({ params }: PageProps<"/[lang]/text">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const d = getDict(lang);
  return <h1>{d.navText}</h1>;
}
