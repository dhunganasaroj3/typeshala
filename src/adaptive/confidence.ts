import { speedToTime } from './constants'

/**
 * Keybr's definition: confidence = targetMsPerChar / yourMsPerChar = yourSpeed / target.
 * No accuracy term — accuracy enters only by excluding typo keystrokes from the timing sample.
 * A calibrated-but-slow key reads near 0; a key at/above target reads >= 1.
 */
export function confidence(emaTime: number | null, targetCpm: number): number | null {
  if (emaTime == null || emaTime <= 0) return null
  return speedToTime(targetCpm) / emaTime
}
