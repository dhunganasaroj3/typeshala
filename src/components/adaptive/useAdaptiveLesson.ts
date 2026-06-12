import { useCallback, useMemo, useRef, useState } from 'react'
import type { Lang } from '../../types'
import type { KeyConfidence, LessonPlan } from '../../adaptive/types'
import { keyConfidences, planLesson } from '../../adaptive/guided'
import { alphabetFor, getModel } from '../../adaptive/generator/models'
import { generateLesson } from '../../adaptive/generator/lesson'
import { useAdaptive } from '../../store/useAdaptive'
import { useSettings } from '../../store/useSettings'

export interface AdaptiveLesson {
  /** The plan for this lesson (included tokens, focus, etc.). */
  plan: LessonPlan
  /** The graded roman string. */
  roman: string
  /** Devanagari rendering (Nepali only). */
  dev?: string
  /** Per-token confidence table for panels/keyboard. */
  keyConfidences: KeyConfidence[]
  /** Force a brand-new lesson with the current plan/settings. */
  regenerate: () => void
}

/**
 * Owns the lifecycle of a single adaptive lesson.
 *
 * Recomputes the plan + confidence table whenever the language, the language's
 * lessonCount, or the adaptive settings change. The actual generated text is
 * regenerated on those same triggers AND on demand via `regenerate()` (so the
 * caller can advance to the next lesson without changing any inputs).
 */
export function useAdaptiveLesson(): AdaptiveLesson {
  const lang: Lang = useSettings((s) => s.lang)
  const byLang = useAdaptive((s) => s.byLang)
  const settings = useAdaptive((s) => s.settings)

  const state = byLang[lang]
  const lessonCount = state.lessonCount

  // Bump this to force a fresh draw of the generated text.
  const [nonce, setNonce] = useState(0)
  const regenerate = useCallback(() => setNonce((n) => n + 1), [])

  // The unlock-order alphabet is stable per language.
  const alphabet = useMemo(() => alphabetFor(lang), [lang])

  // Plan + confidences depend only on persisted state + settings.
  const plan = useMemo(
    () =>
      planLesson(state, {
        alphabet,
        targetCpm: settings.targetCpm,
        alphabetSize: settings.alphabetSize,
        recover: settings.recover,
      }),
    [
      state,
      alphabet,
      settings.targetCpm,
      settings.alphabetSize,
      settings.recover,
    ],
  )

  const confidences = useMemo(
    () => keyConfidences(state, plan, settings.targetCpm, alphabet),
    [state, plan, settings.targetCpm, alphabet],
  )

  // The generated text. Recompute when the plan, language, the text-shaping
  // settings, the lesson count, or the regenerate nonce changes.
  // We keep a ref so identical recomputations (e.g. React strict re-renders)
  // don't thrash, but the dependency list is the source of truth.
  const textSig = useRef('')
  const generated = useMemo(
    () => {
      const model = getModel(lang)
      return generateLesson(model, plan, lang, {
        wordsPerLesson: settings.wordsPerLesson,
        naturalWords: settings.naturalWords,
        pCapitals: settings.pCapitals,
        pPunct: settings.pPunct,
      })
    },
    // lessonCount + nonce are explicit regeneration triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      lang,
      plan,
      settings.wordsPerLesson,
      settings.naturalWords,
      settings.pCapitals,
      settings.pPunct,
      lessonCount,
      nonce,
    ],
  )
  textSig.current = generated.roman

  return {
    plan,
    roman: generated.roman,
    dev: generated.dev,
    keyConfidences: confidences,
    regenerate,
  }
}

export default useAdaptiveLesson
