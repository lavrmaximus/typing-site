"use client";

import { useEffect, useState } from "react";
import { loadResults, useAccount } from "@/account/account";
import type { Result } from "@/account/types";
import type { Lang } from "@/i18n/dict";

/** The visitor's results for a language (account or guest); null while loading. */
export function useResults(lang: Lang): Result[] | null {
  const { status } = useAccount();
  const [results, setResults] = useState<Result[] | null>(null);
  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    loadResults(lang).then((r) => { if (alive) setResults(r); });
    return () => { alive = false; };
  }, [lang, status]);
  return results;
}
