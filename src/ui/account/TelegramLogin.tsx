"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window { onTelegramAuth?: (user: Record<string, unknown>) => void }
}

/** Telegram Login Widget (https://core.telegram.org/widgets/login). */
export function TelegramLogin({ bot, onAuth }: { bot: string; onAuth: (user: Record<string, unknown>) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const handler = useRef(onAuth);
  useEffect(() => { handler.current = onAuth; });
  useEffect(() => {
    window.onTelegramAuth = (user) => handler.current(user);
    const el = box.current;
    if (!el) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.dataset.telegramLogin = bot;
    s.dataset.size = "large";
    s.dataset.radius = "10";
    s.dataset.onauth = "onTelegramAuth(user)";
    el.appendChild(s);
    return () => { el.innerHTML = ""; delete window.onTelegramAuth; };
  }, [bot]);
  return <div ref={box} data-testid="telegram-login" data-bot={bot} />;
}
