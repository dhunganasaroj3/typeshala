import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../types'
import { applyLesson } from '../adaptive/apply'
import type { LessonKeyTiming } from '../adaptive/histogram'
import { emptyLangState, type LangAdaptiveState } from '../adaptive/types'
import { DEFAULT_TARGET_CPM, DEFAULT_WORDS_PER_LESSON } from '../adaptive/constants'

export interface AdaptiveSettings {
  targetCpm: number // 75..750
  alphabetSize: number // 0..1 slider (force-include)
  recover: boolean // stricter unlock; default false
  naturalWords: boolean // real words vs generated; default false
  pCapitals: number // 0..1; EN only
  pPunct: number // 0..1
  wordsPerLesson: number
  unit: 'wpm' | 'cpm'
  showZones: boolean
  highlightNextKey: boolean
}

const DEFAULT_SETTINGS: AdaptiveSettings = {
  targetCpm: DEFAULT_TARGET_CPM,
  alphabetSize: 0,
  recover: false,
  naturalWords: false,
  pCapitals: 0,
  pPunct: 0,
  wordsPerLesson: DEFAULT_WORDS_PER_LESSON,
  unit: 'wpm',
  showZones: false,
  highlightNextKey: true,
}

interface AdaptiveStore {
  byLang: Record<Lang, LangAdaptiveState>
  settings: AdaptiveSettings
  recordLesson: (lang: Lang, timings: LessonKeyTiming[], now: number) => void
  setSettings: (patch: Partial<AdaptiveSettings>) => void
  resetLang: (lang: Lang) => void
  importAll: (data: Partial<Pick<AdaptiveStore, 'byLang' | 'settings'>>) => void
}

export const useAdaptive = create<AdaptiveStore>()(
  persist(
    (set, get) => ({
      byLang: { en: emptyLangState(), ne: emptyLangState() },
      settings: DEFAULT_SETTINGS,

      recordLesson: (lang, timings, now) => {
        const s = get()
        set({
          byLang: { ...s.byLang, [lang]: applyLesson(s.byLang[lang], timings, now) },
        })
      },

      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

      resetLang: (lang) => set({ byLang: { ...get().byLang, [lang]: emptyLangState() } }),

      importAll: (data) => set({ ...data }),
    }),
    {
      name: 'ts.adaptive.v1',
      merge: (persisted, current) => {
        // tolerate older/partial persisted shapes
        const p = (persisted ?? {}) as Partial<AdaptiveStore>
        return {
          ...current,
          ...p,
          byLang: {
            en: p.byLang?.en ?? emptyLangState(),
            ne: p.byLang?.ne ?? emptyLangState(),
          },
          settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
        }
      },
    },
  ),
)
