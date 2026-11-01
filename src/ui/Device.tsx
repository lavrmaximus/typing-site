"use client";

import type { CSSProperties, ReactNode } from "react";
import { glowHue, glowStrength } from "@/engine/metrics";
import styles from "./Device.module.css";

/**
 * The keyboard "case". Its backlight hue follows the current speed in chars
 * per minute; children are laid out inside. `screen` is the recessed display.
 */
export function Device({ glowCpm, screen, children }: { glowCpm: number; screen: ReactNode; children?: ReactNode }) {
  const style = { "--glow-h": glowHue(glowCpm), "--glow-a": glowStrength(glowCpm).toFixed(2) } as CSSProperties;
  return (
    <section className={styles.device} style={style} data-testid="device">
      <div className={styles.underglow} aria-hidden="true" />
      <div className={styles.screen}>{screen}</div>
      {children}
    </section>
  );
}
