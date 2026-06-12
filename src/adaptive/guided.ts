import { MIN_ALPHABET } from './constants'
import { confidence } from './confidence'
import type { KeyConfidence, KeyState, LangAdaptiveState, LessonPlan } from './types'

export interface GuidedOpts {
  alphabet: string[] // tokens in DESCENDING frequency order (language-specific)
  targetCpm: number
  alphabetSize: number // 0..1 slider -> raises maxSize (manual force-include)
  recover: boolean // false = forgiving (bestConfidence), true = current confidence
}

/** Confidence used by the unlock gate: forgiving uses best-ever, recover uses current. */
function gateConf(k: KeyState | undefined, target: number, recover: boolean): number | null {
  if (!k) return null
  const t = recover ? k.emaTimeToType : (k.bestTimeToType ?? k.emaTimeToType)
  return confidence(t, target)
}

/**
 * Decide which tokens are active this lesson and which is the focus.
 * Seed the first MIN_ALPHABET tokens; unlock the next token only once every
 * currently-included token has (gate) confidence >= 1. The weakest CURRENT-confidence
 * included token (< 1) becomes the focus (forced into nearly every generated word).
 */
export function planLesson(state: LangAdaptiveState, o: GuidedOpts): LessonPlan {
  const total = o.alphabet.length
  const maxSize = MIN_ALPHABET + Math.round((total - MIN_ALPHABET) * o.alphabetSize)
  const included: string[] = []
  let newlyUnlocked: string | null = null

  for (const token of o.alphabet) {
    if (included.length < MIN_ALPHABET) {
      included.push(token)
      continue
    }
    if (included.length < maxSize) {
      // manual slider force-include beyond the gate
      included.push(token)
      continue
    }
    const best = gateConf(state.keys[token], o.targetCpm, o.recover)
    if (best != null && best >= 1) {
      included.push(token) // already mastered from prior practice
      continue
    }
    // gate: unlock the next NEW token only if every included token is mastered
    const allMastered = included.every((tk) => {
      const c = gateConf(state.keys[tk], o.targetCpm, o.recover)
      return c != null && c >= 1
    })
    if (allMastered) {
      included.push(token)
      newlyUnlocked = token
    }
    break // first failing/new token ends inclusion
  }

  // focus = lowest CURRENT confidence among included keys with confidence < 1
  let focus: string | null = null
  let lowest = Infinity
  for (const tk of included) {
    const c = confidence(state.keys[tk]?.emaTimeToType ?? null, o.targetCpm)
    const cv = c == null ? 0 : c // new/uncalibrated -> 0 -> auto focus
    if (cv < 1 && cv < lowest) {
      lowest = cv
      focus = tk
    }
  }

  return { included, focus, newlyUnlocked, maxSize }
}

/** Build the confidence table for the letter-grid panel + keyboard heatmap. */
export function keyConfidences(
  state: LangAdaptiveState,
  plan: LessonPlan,
  targetCpm: number,
  alphabet: string[],
): KeyConfidence[] {
  const includedSet = new Set(plan.included)
  return alphabet.map((token) => {
    const k = state.keys[token]
    return {
      token,
      confidence: confidence(k?.emaTimeToType ?? null, targetCpm),
      bestConfidence: confidence(k?.bestTimeToType ?? null, targetCpm),
      calibrated: !!k && k.emaTimeToType != null,
      included: includedSet.has(token),
      focus: plan.focus === token,
      hits: k?.totalHits ?? 0,
      misses: k?.totalMisses ?? 0,
    }
  })
}
