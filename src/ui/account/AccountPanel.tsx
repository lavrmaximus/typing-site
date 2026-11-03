"use client";

import { useState } from "react";
import { login, logout, register, telegramLogin, useAccount, type ApiError } from "@/account/account";
import type { Dict, Lang } from "@/i18n/dict";
import { KeyButton, KeyLink } from "../KeyCap";
import { TelegramLogin } from "./TelegramLogin";
import styles from "./Account.module.css";

const message = (d: Dict, e: ApiError) =>
  ({ taken: d.errTaken, wrong: d.errWrong, throttled: d.errThrottled, invalid: d.errInvalid, offline: d.errOffline, "linked-elsewhere": d.errLinked, unknown: d.errUnknown })[e];

export function AccountPanel({ lang, d }: { lang: Lang; d: Dict }) {
  const account = useAccount();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<ApiError | null>) => {
    setBusy(true);
    setError(await fn());
    setBusy(false);
  };

  if (account.status === "loading") return <section className={styles.panel} aria-busy="true" />;

  if (account.status === "user" && account.me) {
    const me = account.me;
    return (
      <section className={styles.panel}>
        <p className={styles.who}>{d.signedInAs} <b>{me.username}</b></p>
        {me.telegram ? (
          <p className={styles.note}>✓ {d.telegramLinked}{me.telegram.username ? ` (@${me.telegram.username})` : ""}</p>
        ) : account.telegramBot ? (
          <>
            <p className={styles.note}>{d.linkTelegram}</p>
            <TelegramLogin bot={account.telegramBot} onAuth={(u) => run(() => telegramLogin(u))} />
          </>
        ) : null}
        {error && <p className={styles.error} role="alert">{message(d, error)}</p>}
        <div className={styles.row}>
          <KeyLink href={`/${lang}/stats`} accent>{d.toStats}</KeyLink>
          <KeyButton onClick={() => void logout()}>{d.logOut}</KeyButton>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        <KeyButton role="tab" aria-selected={tab === "in"} pressed={tab === "in"} onClick={() => { setTab("in"); setError(null); }}>{d.signInTab}</KeyButton>
        <KeyButton role="tab" aria-selected={tab === "up"} pressed={tab === "up"} onClick={() => { setTab("up"); setError(null); }}>{d.signUp}</KeyButton>
      </div>
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const u = String(f.get("username") ?? "").trim();
          const p = String(f.get("password") ?? "");
          void run(() => (tab === "up" ? register(u, p) : login(u, p)));
        }}
      >
        <label className={styles.field}>
          {d.username}
          <input id="account-username" name="username" autoComplete="username" required minLength={tab === "up" ? 3 : 1} maxLength={32} />
          {tab === "up" && <small>{d.usernameHint}</small>}
        </label>
        <label className={styles.field}>
          {d.password}
          <input id="account-password" name="password" type="password" autoComplete={tab === "up" ? "new-password" : "current-password"} required minLength={tab === "up" ? 6 : 1} maxLength={128} />
          {tab === "up" && <small>{d.passwordHint}</small>}
        </label>
        {error && <p className={styles.error} role="alert">{message(d, error)}</p>}
        {!account.online && !error && <p className={styles.error} role="alert">{d.errOffline}</p>}
        <KeyButton type="submit" accent disabled={busy || !account.online}>{tab === "up" ? d.createAccount : d.signIn}</KeyButton>
      </form>
      {account.telegramBot && (
        <>
          <p className={styles.or}>{d.orTelegram}</p>
          <TelegramLogin bot={account.telegramBot} onAuth={(u) => run(() => telegramLogin(u))} />
        </>
      )}
      <p className={styles.note}>{d.guestNote}</p>
    </section>
  );
}
