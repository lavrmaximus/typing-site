"use client";

import { Device } from "./Device";
import { Keyboard } from "./Keyboard";
import { Readout } from "./Readout";
import type { Dict } from "@/i18n/dict";

/** Idle device used until a typing page mounts its own session. */
export function IdleStage({ d }: { d: Dict }) {
  return (
    <Device glowCpm={0} screen={<div style={{ height: 190 }} />}>
      <Readout speed={0} accuracy={100} seconds={0} progress={0} labels={{ unit: d.unit, accuracy: d.accuracy, time: d.time, progress: d.progress }} />
      <Keyboard press={null} />
    </Device>
  );
}
