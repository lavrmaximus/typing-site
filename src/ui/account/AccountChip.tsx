"use client";

import { useAccount } from "@/account/account";
import { KeyLink } from "../KeyCap";

/** Header keycap: "Sign in" for guests, the username when signed in. */
export function AccountChip({ lang, label, current }: { lang: string; label: string; current: boolean }) {
  const { status, me } = useAccount();
  return (
    <KeyLink href={`/${lang}/account`} pressed={current} data-testid="account-chip">
      {status === "user" && me ? me.username : label}
    </KeyLink>
  );
}
