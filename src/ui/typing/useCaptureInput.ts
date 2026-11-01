"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Key } from "@/engine/types";

interface Handlers {
  onKey: (k: Key) => void;
  onRestart: () => void;
  done: boolean;
  /** code mode: Tab, Enter and End are editor keys */
  editor: boolean;
}

/** Map a keydown to an engine key. `null` = not ours (let the browser or the input event handle it). */
export function toKey(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">, editor: boolean): Key | null {
  const mod = e.ctrlKey || e.metaKey;
  switch (e.key) {
    case "Backspace": return { kind: "backspace", word: mod || e.altKey };
    case "Enter": return editor ? { kind: "enter", ctrl: mod } : null;
    case "Tab": return editor ? { kind: "tab" } : null;
    case "End": return editor ? { kind: "end" } : null;
  }
  if (e.key.length === 1 && !mod && !e.altKey) return { kind: "char", ch: e.key };
  if (e.key.length === 1 && e.altKey && !mod) return { kind: "char", ch: e.key }; // AltGr / Option layouts
  return null;
}

/**
 * A hidden textarea owns keyboard focus. Keydown produces engine keys; text
 * that arrives without a usable keydown (IME, paste, mobile) comes through the
 * input event. Typing while focus is elsewhere brings focus back without losing the key.
 */
export function useCaptureInput({ onKey, onRestart, done, editor }: Handlers) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const h = useRef({ onKey, onRestart, done, editor });
  useEffect(() => { h.current = { onKey, onRestart, done, editor }; });

  const handle = (e: KeyboardEvent | ReactKeyboardEvent) => {
    const { onKey, onRestart, done, editor } = h.current;
    // keys that belong to an IME composition are not ours; the committed text arrives via input
    const native = "nativeEvent" in e ? e.nativeEvent : e;
    if (native.isComposing || native.keyCode === 229) return;
    if (e.key === "Escape") { e.preventDefault(); onRestart(); return; }
    if (done) {
      if (e.key === "Enter") { e.preventDefault(); onRestart(); }
      return;
    }
    if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "PageUp" || e.key === "PageDown") { e.preventDefault(); return; }
    if (e.key === "Tab" && !editor) return;
    const key = toKey(e, editor);
    if (!key) { if (e.key === "Enter") e.preventDefault(); return; }
    e.preventDefault();
    onKey(key);
  };

  useEffect(() => {
    const onDocKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || document.activeElement === el) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("button, a, input, select, textarea, [contenteditable]") && (e.key === "Enter" || e.key === " " || e.key === "Tab")) return;
      if (e.ctrlKey || e.metaKey) return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter" || e.key === "Escape") {
        el.focus({ preventScroll: true });
        handle(e);
      }
    };
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, []);

  /** Feed whatever text sits in the field to the engine, then empty it. */
  const consume = (el: HTMLTextAreaElement) => {
    const text = el.value;
    el.value = "";
    if (h.current.done) return;
    for (const ch of text) if (ch !== "\n" && ch !== "\r") h.current.onKey({ kind: "char", ch });
  };

  const props = {
    ref,
    onKeyDown: handle,
    onInput: (e: React.FormEvent<HTMLTextAreaElement>) => {
      if ((e.nativeEvent as InputEvent).isComposing) return; // wait for the composition to finish
      consume(e.currentTarget);
    },
    onCompositionEnd: (e: React.CompositionEvent<HTMLTextAreaElement>) => consume(e.currentTarget),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false,
    "aria-label": "typing input",
  } as const;

  const focus = useCallback(() => ref.current?.focus({ preventScroll: true }), []);
  return { props, focused, focus };
}
