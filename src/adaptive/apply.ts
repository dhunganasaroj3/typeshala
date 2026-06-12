import { SAMPLE_CAP } from './constants'
import { ema } from './filter'
import type { LessonKeyTiming } from './histogram'
import type { KeyState, LangAdaptiveState } from './types'

/** Pure: fold one lesson's timings into per-key state, returning a NEW LangAdaptiveState. */
export function applyLesson(
  prev: LangAdaptiveState,
  timings: LessonKeyTiming[],
  now: number,
): LangAdaptiveState {
  const keys: Record<string, KeyState> = { ...prev.keys }
  const idx = prev.lessonCount

  for (const t of timings) {
    const existing = keys[t.token]
    const k: KeyState = existing
      ? { ...existing, samples: existing.samples.slice() }
      : {
          token: t.token,
          emaTimeToType: null,
          bestTimeToType: null,
          totalHits: 0,
          totalMisses: 0,
          samples: [],
        }
    k.totalHits += t.hits
    k.totalMisses += t.misses
    if (t.meanMs != null) {
      const filtered = ema(k.emaTimeToType, t.meanMs)
      k.emaTimeToType = filtered
      k.bestTimeToType =
        k.bestTimeToType == null ? filtered : Math.min(k.bestTimeToType, filtered)
      k.samples.push({
        index: idx,
        ts: now,
        hits: t.hits,
        misses: t.misses,
        timeToType: t.meanMs,
        filtered,
      })
      if (k.samples.length > SAMPLE_CAP) k.samples = k.samples.slice(-SAMPLE_CAP)
    }
    keys[t.token] = k
  }

  return { ...prev, keys, lessonCount: idx + 1 }
}
