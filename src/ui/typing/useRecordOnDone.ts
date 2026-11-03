"use client";

import { useEffect, useRef } from "react";
import { recordResult } from "@/account/account";
import type { Result } from "@/account/types";

/** Save the attempt once, the moment it is finished (timestamped then). */
export function useRecordOnDone(done: boolean, make: () => Omit<Result, "at">) {
  const saved = useRef(false);
  const latest = useRef(make);
  useEffect(() => { latest.current = make; });
  useEffect(() => {
    if (!done || saved.current) return;
    saved.current = true;
    void recordResult({ ...latest.current(), at: Date.now() });
  }, [done]);
}
