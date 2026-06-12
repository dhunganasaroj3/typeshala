// Adaptive engine data structures.

/** One per-key sample recorded after a single lesson. */
export interface KeySample {
  index: number // lesson ordinal
  ts: number // epoch ms
  hits: number
  misses: number
  timeToType: number // raw mean ms/char over correct hits (this lesson)
  filtered: number // EMA value AFTER this sample
}

/** Persisted state for one token (e.g. 'e', or 'kh', 'aa'). */
export interface KeyState {
  token: string
  emaTimeToType: number | null // latest EMA ms/char -> current confidence
  bestTimeToType: number | null // min EMA ever -> bestConfidence
  totalHits: number
  totalMisses: number
  samples: KeySample[] // capped to last SAMPLE_CAP
}

/** Per-language adaptive record (lives in the store, keyed by Lang). */
export interface LangAdaptiveState {
  keys: Record<string, KeyState>
  lessonCount: number
  lastFocus: string | null
}

/** Derived per-lesson plan (not persisted). */
export interface LessonPlan {
  included: string[] // active tokens, frequency order
  focus: string | null // weakest included token (confidence < 1) or null
  newlyUnlocked: string | null
  maxSize: number
}

export interface KeyConfidence {
  token: string
  confidence: number | null // current: targetTime / ema
  bestConfidence: number | null // targetTime / best
  calibrated: boolean
  included: boolean
  focus: boolean
  hits: number
  misses: number
}

export function emptyLangState(): LangAdaptiveState {
  return { keys: {}, lessonCount: 0, lastFocus: null }
}
