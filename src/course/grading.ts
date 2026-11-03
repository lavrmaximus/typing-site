/** Speed needed to pass lesson n (0-based), chars per minute. */
export const targetCpm = (index: number) => Math.min(250, 60 + 8 * index);

export const PASS_ACCURACY = 94;

/** 0 = not passed, 1–3 stars. */
export function gradeLesson(accuracy: number, cpm: number, target: number): number {
  if (accuracy < PASS_ACCURACY || cpm < target) return 0;
  if (accuracy >= 99 && cpm >= target * 1.3) return 3;
  if (accuracy >= 97) return 2;
  return 1;
}
