import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DayAggregate, KeyStat, Lang, PersonalBest, TestResult } from '../types'
import { localDay } from '../game/gamification'

const MAX_RESULTS = 500
const EMA_ALPHA = 0.1

export type KeyBatch = Record<string, { hits: number; misses: number; avgLatency: number | null }>

interface StatsState {
  results: TestResult[] // newest first
  pbs: Record<string, PersonalBest> // `${lang}|${mode}|${mode2}`
  keys: Record<string, KeyStat> // `${lang}:${char}`
  days: Record<string, DayAggregate> // localDay
  ghosts: Record<string, Array<{ t: number; i: number }>> // passageId -> keystroke timeline
  /** Save a result; sets isPb on the stored copy and returns whether it was a PB. */
  saveResult: (r: TestResult) => boolean
  /** Bulk-merge per-key stats collected during one drill. */
  mergeKeyStats: (lang: Lang, batch: KeyBatch) => void
  saveGhost: (passageId: string, timeline: Array<{ t: number; i: number }>) => void
  importAll: (data: Pick<StatsState, 'results' | 'pbs' | 'keys' | 'days' | 'ghosts'>) => void
}

export function pbKey(lang: Lang, mode: string, mode2: string) {
  return `${lang}|${mode}|${mode2}`
}

export const useStats = create<StatsState>()(
  persist(
    (set, get) => ({
      results: [],
      pbs: {},
      keys: {},
      days: {},
      ghosts: {},

      saveResult: (r) => {
        const s = get()
        const key = pbKey(r.lang, r.mode, r.mode2)
        const prev = s.pbs[key]
        const eligible = !r.afkInvalid && r.seconds >= 30 && (r.mode === 'time' || r.mode === 'words')
        const isPb = eligible && (!prev || r.wpm >= prev.wpm + 1)
        const stored: TestResult = { ...r, isPb }

        const day = localDay(r.ts)
        const d = s.days[day] ?? { tests: 0, timeSec: 0, bestWpm: 0, xp: 0 }
        const dayAgg: DayAggregate = {
          tests: d.tests + 1,
          timeSec: d.timeSec + r.seconds,
          bestWpm: Math.max(d.bestWpm, r.afkInvalid ? 0 : r.wpm),
          xp: d.xp + r.xp,
        }

        set({
          results: [stored, ...s.results].slice(0, MAX_RESULTS),
          pbs: isPb
            ? { ...s.pbs, [key]: { wpm: r.wpm, raw: r.raw, acc: r.acc, consistency: r.consistency, ts: r.ts } }
            : s.pbs,
          days: { ...s.days, [day]: dayAgg },
        })
        return isPb
      },

      mergeKeyStats: (lang, batch) => {
        const keys = { ...get().keys }
        for (const [ch, b] of Object.entries(batch)) {
          const k = `${lang}:${ch}`
          const prev = keys[k] ?? { hits: 0, misses: 0, emaLatency: null, best: null }
          let ema = prev.emaLatency
          if (b.avgLatency != null) {
            ema = ema == null ? b.avgLatency : ema + EMA_ALPHA * (b.avgLatency - ema)
          }
          keys[k] = {
            hits: prev.hits + b.hits,
            misses: prev.misses + b.misses,
            emaLatency: ema,
            best:
              b.avgLatency != null && (prev.best == null || b.avgLatency < prev.best)
                ? b.avgLatency
                : prev.best,
          }
        }
        set({ keys })
      },

      saveGhost: (passageId, timeline) => {
        const ghosts = { ...get().ghosts, [passageId]: timeline }
        // cap stored ghosts at 20 passages (drop oldest insertion order)
        const ids = Object.keys(ghosts)
        if (ids.length > 20) delete ghosts[ids[0]]
        set({ ghosts })
      },

      importAll: (data) => set({ ...data }),
    }),
    { name: 'ts.stats.v1' },
  ),
)
