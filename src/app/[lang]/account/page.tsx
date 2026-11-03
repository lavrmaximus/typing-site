import { notFound } from "next/navigation";
import { getDict, isLang } from "@/i18n/dict";
import { Shell } from "@/ui/Shell";
import { AccountPanel } from "@/ui/account/AccountPanel";

export default async function Page({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <Shell lang={lang} mode="account">
      <AccountPanel lang={lang} d={getDict(lang)} />
    </Shell>
  );
}
