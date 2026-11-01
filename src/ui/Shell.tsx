import type { ReactNode } from "react";
import { LANGS, getDict, type Lang } from "@/i18n/dict";
import { KeyLink } from "./KeyCap";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Shell.module.css";

export type Mode = "code" | "text";

export function Shell({ lang, mode, children }: { lang: Lang; mode: Mode; children: ReactNode }) {
  const d = getDict(lang);
  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <a className={styles.logo} href={`/${lang}/code`}>
          <i aria-hidden="true" />
          ритм
        </a>
        <nav className={styles.group} aria-label="mode">
          <KeyLink href={`/${lang}/code`} pressed={mode === "code"}>{d.navCode}</KeyLink>
          <KeyLink href={`/${lang}/text`} pressed={mode === "text"}>{d.navText}</KeyLink>
        </nav>
        <div className={styles.group}>
          <nav className={styles.group} aria-label={d.langSwitch}>
            {LANGS.map((l) => (
              <KeyLink key={l} href={`/${l}/${mode}`} pressed={l === lang} hrefLang={l}>
                {l.toUpperCase()}
              </KeyLink>
            ))}
          </nav>
          <ThemeToggle toLight={d.themeToLight} toDark={d.themeToDark} />
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.foot}>{d.footerContent}</footer>
    </div>
  );
}
