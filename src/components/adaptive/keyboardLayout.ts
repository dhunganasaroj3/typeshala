import type { KeyConfidence } from '../../adaptive/types'
import { tokenToKeys } from '../../adaptive/generator/tokenize'

/** QWERTY rows of latin keys (same layout as the stats KeyHeatmap). */
export const ROWS: string[] = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export interface FingerZone {
  id: string
  label: string
  color: string
}

/** Eight finger zones (Keybr-style). */
export const ZONES: Record<string, FingerZone> = {
  lPinky: { id: 'lPinky', label: 'Left pinky', color: '#e15554' },
  lRing: { id: 'lRing', label: 'Left ring', color: '#e1a04c' },
  lMiddle: { id: 'lMiddle', label: 'Left middle', color: '#e8d44d' },
  lIndex: { id: 'lIndex', label: 'Left index', color: '#3bb273' },
  rIndex: { id: 'rIndex', label: 'Right index', color: '#4d9de0' },
  rMiddle: { id: 'rMiddle', label: 'Right middle', color: '#7768ae' },
  rRing: { id: 'rRing', label: 'Right ring', color: '#b15cc4' },
  rPinky: { id: 'rPinky', label: 'Right pinky', color: '#e0609b' },
}

/** Latin key -> finger zone id (standard touch-typing assignment). */
export const FINGER_ZONES: Record<string, string> = {
  // left pinky
  q: 'lPinky',
  a: 'lPinky',
  z: 'lPinky',
  // left ring
  w: 'lRing',
  s: 'lRing',
  x: 'lRing',
  // left middle
  e: 'lMiddle',
  d: 'lMiddle',
  c: 'lMiddle',
  // left index
  r: 'lIndex',
  f: 'lIndex',
  v: 'lIndex',
  t: 'lIndex',
  g: 'lIndex',
  b: 'lIndex',
  // right index
  y: 'rIndex',
  h: 'rIndex',
  n: 'rIndex',
  u: 'rIndex',
  j: 'rIndex',
  m: 'rIndex',
  // right middle
  i: 'rMiddle',
  k: 'rMiddle',
  // right ring
  o: 'rRing',
  l: 'rRing',
  // right pinky
  p: 'rPinky',
}

export interface AggregatedKey {
  confidence: number | null
  calibrated: boolean
}

/**
 * Aggregate token-level confidences down to individual latin keys.
 * A multi-key token (e.g. 'kh', 'aa') contributes its confidence to each
 * constituent latin key; per-key values are then averaged across tokens.
 */
export function aggregateTokenStats(
  keyConfidences: KeyConfidence[],
): Record<string, AggregatedKey> {
  const sums: Record<string, { total: number; count: number; calibrated: boolean }> = {}

  for (const kc of keyConfidences) {
    if (kc.confidence == null || !kc.calibrated) continue
    const keys = tokenToKeys(kc.token)
    if (keys.length === 0) continue
    for (const key of keys) {
      if (!sums[key]) sums[key] = { total: 0, count: 0, calibrated: false }
      sums[key].total += kc.confidence
      sums[key].count += 1
      sums[key].calibrated = true
    }
  }

  const out: Record<string, AggregatedKey> = {}
  for (const [key, v] of Object.entries(sums)) {
    out[key] = {
      confidence: v.count > 0 ? v.total / v.count : null,
      calibrated: v.calibrated,
    }
  }
  return out
}

/**
 * Confidence -> color ramp. 0 (slow) -> red, 1+ (at/above target) -> green.
 * Uncalibrated keys should be rendered neutral by the caller (null confidence).
 */
export function confidenceColor(confidence: number | null): string {
  if (confidence == null) return 'var(--surface, #2a2a2a)'
  const clamped = Math.max(0, Math.min(1, confidence))
  const hue = clamped * 120 // 0 red -> 120 green
  return `hsl(${hue}, 60%, 45%)`
}
