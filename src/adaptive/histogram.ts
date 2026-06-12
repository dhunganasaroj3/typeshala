import { MIN_KEYS_PER_LESSON, SAMPLE_MAX_MS, SAMPLE_MIN_MS } from './constants'

export interface LessonKeyTiming {
  token: string
  hits: number
  misses: number
  meanMs: number | null // mean over correct hits; null if no valid samples
}

/**
 * Reduce a lesson's raw per-token timings into one validated timing per token.
 * `latenciesByToken` holds correct-hit latencies; we re-filter to [40, 12000] ms.
 */
export function buildHistogram(
  hitsMisses: Record<string, { hits: number; misses: number }>,
  latenciesByToken: Record<string, number[]>,
): { timings: LessonKeyTiming[]; valid: boolean } {
  const timings: LessonKeyTiming[] = []
  for (const token of Object.keys(hitsMisses)) {
    const lat = (latenciesByToken[token] ?? []).filter(
      (ms) => ms >= SAMPLE_MIN_MS && ms <= SAMPLE_MAX_MS,
    )
    const meanMs = lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null
    timings.push({ token, hits: hitsMisses[token].hits, misses: hitsMisses[token].misses, meanMs })
  }
  const distinct = timings.filter((t) => t.meanMs != null).length
  return { timings, valid: distinct >= MIN_KEYS_PER_LESSON }
}
