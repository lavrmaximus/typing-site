import { KeyPlate } from "./KeyCap";
import styles from "./Readout.module.css";

export interface ReadoutProps {
  speed: number;
  accuracy: number;
  seconds: number;
  progress: number;
  labels: { unit: string; accuracy: string; time: string; progress: string };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Readout({ speed, accuracy, seconds, progress, labels }: ReadoutProps) {
  return (
    <div className={styles.row}>
      <KeyPlate className={styles.plate}><b className={styles.hot} data-testid="speed">{speed}</b><span>{labels.unit}</span></KeyPlate>
      <KeyPlate className={styles.plate}><b data-testid="accuracy">{accuracy}%</b><span>{labels.accuracy}</span></KeyPlate>
      <KeyPlate className={styles.plate}><b data-testid="time">{clock(seconds)}</b><span>{labels.time}</span></KeyPlate>
      <KeyPlate className={`${styles.plate} ${styles.grow}`}>
        <div className={styles.meter} role="progressbar" aria-label={labels.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <i style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </KeyPlate>
    </div>
  );
}
