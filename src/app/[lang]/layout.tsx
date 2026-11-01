import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JetBrains_Mono, Rubik, Rubik_Mono_One } from "next/font/google";
import { LANGS, getDict, isLang } from "@/i18n/dict";
import { THEME_INIT } from "@/ui/ThemeToggle";
import "../globals.css";

const rubik = Rubik({ subsets: ["latin", "cyrillic"], variable: "--font-rubik", display: "swap" });
const rubikMono = Rubik_Mono_One({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-rubik-mono", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-jetbrains", display: "swap" });

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const d = getDict(lang);
  return {
    title: d.title,
    description: d.description,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/code`])) },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning className={`${rubik.variable} ${rubikMono.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
