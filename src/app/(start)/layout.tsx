import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ритм", robots: { index: false } };

/** Root layout for "/" only: a blank page that sends the visitor to /ru or /en. */
export default function StartLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body style={{ background: "#0c0e14" }}>{children}</body>
    </html>
  );
}
