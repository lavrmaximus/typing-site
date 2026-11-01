import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import styles from "./KeyCap.module.css";

type Common = { pressed?: boolean; accent?: boolean; className?: string; children: ReactNode };

const cls = ({ pressed, accent, className }: Common) =>
  [styles.cap, pressed && styles.pressed, accent && styles.accent, className].filter(Boolean).join(" ");

/** A keycap-styled link: sinks when it is the current page. */
export function KeyLink({ pressed, accent, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} aria-current={pressed ? "page" : undefined} className={cls({ pressed, accent, className, children })}>
      {children}
    </Link>
  );
}

/** A keycap-styled button: `pressed` reflects a toggle's on state. */
export function KeyButton({ pressed, accent, className, children, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type="button" {...rest} aria-pressed={pressed} className={cls({ pressed, accent, className, children })}>
      {children}
    </button>
  );
}

/** A non-interactive keycap surface (stat plates). */
export function KeyPlate({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cls({ className, children })} data-plate>{children}</div>;
}
