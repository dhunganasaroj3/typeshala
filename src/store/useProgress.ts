import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AchievementState, Lang, StreakState } from '../types'
import { advanceStreak, DAILY_GOAL_XP, localDay } from '../game/gamification'

export interface LessonProgress {
  stars: number
  bestAcc: number
  passed: boolean
}

export interface ProgressEvents {
  leveledUpTo: number | null
  streakMilestone: number | null
  shieldSpent: boolean
  shieldEarned: boolean
  dailyGoalJustMet: boolean
}

interface ProgressState {
  xp: number
  streak: StreakState
  achievements: Record<string, AchievementState>
  lessons: Record<string, LessonProgress>
  lifetimeKeys: number
  perfectDrills: number
  dailyXp: Record<string, number> // localDay -> xp
  langsByDay: Record<string, Lang[]>
  bestGameScores: Record<string, number>
  ghostBeaten: boolean

  /** Add XP + housekeeping for one completed activity. Returns events for celebrations. */
  addActivity: (args: {
    xp: number
    ts: number
    lang: Lang
    keystrokes: number
    perfect: boolean
  }) => ProgressEvents
  recordLesson: (lessonId: string, acc: number, stars: number, passed: boolean) => void
  recordGameScore: (gameId: string, score: number) => void
  setGhostBeaten: () => void
  unlockAchievement: (id: string, progress: number) => boolean
  setAchievementProgress: (id: string, progress: number) => void
  importAll: (data: Partial<ProgressState>) => void
}

import { levelForXp } from '../game/gamification'

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: { current: 0, longest: 0, lastActive: '', shields: 0 },
      achievements: {},
      lessons: {},
      lifetimeKeys: 0,
      perfectDrills: 0,
      dailyXp: {},
      langsByDay: {},
      bestGameScores: {},
      ghostBeaten: false,

      addActivity: ({ xp, ts, lang, keystrokes, perfect }) => {
        const s = get()
        const day = localDay(ts)
        const beforeLevel = levelForXp(s.xp)
        const newXp = s.xp + xp
        const afterLevel = levelForXp(newXp)

        const dayXpBefore = s.dailyXp[day] ?? 0
        const dayXpAfter = dayXpBefore + xp
        const dailyGoalJustMet = dayXpBefore < DAILY_GOAL_XP && dayXpAfter >= DAILY_GOAL_XP

        let streak = s.streak
        let streakMilestone: number | null = null
        let shieldSpent = false
        let shieldEarned = false
        if (dayXpAfter >= DAILY_GOAL_XP) {
          const upd = advanceStreak(s.streak, day)
          streak = upd.streak
          streakMilestone = upd.milestone
          shieldSpent = upd.shieldSpent
          shieldEarned = upd.shieldEarned
        }

        const langs = s.langsByDay[day] ?? []
        set({
          xp: newXp,
          streak,
          lifetimeKeys: s.lifetimeKeys + keystrokes,
          perfectDrills: s.perfectDrills + (perfect ? 1 : 0),
          dailyXp: { ...s.dailyXp, [day]: dayXpAfter },
          langsByDay: { ...s.langsByDay, [day]: langs.includes(lang) ? langs : [...langs, lang] },
        })

        return {
          leveledUpTo: afterLevel > beforeLevel ? afterLevel : null,
          streakMilestone,
          shieldSpent,
          shieldEarned,
          dailyGoalJustMet,
        }
      },

      recordLesson: (lessonId, acc, stars, passed) => {
        const prev = get().lessons[lessonId] ?? { stars: 0, bestAcc: 0, passed: false }
        set({
          lessons: {
            ...get().lessons,
            [lessonId]: {
              stars: Math.max(prev.stars, stars),
              bestAcc: Math.max(prev.bestAcc, acc),
              passed: prev.passed || passed,
            },
          },
        })
      },

      recordGameScore: (gameId, score) => {
        const best = get().bestGameScores[gameId] ?? 0
        if (score > best) set({ bestGameScores: { ...get().bestGameScores, [gameId]: score } })
      },

      setGhostBeaten: () => set({ ghostBeaten: true }),

      unlockAchievement: (id, progress) => {
        const a = get().achievements[id]
        if (a?.unlockedAt) return false
        set({
          achievements: { ...get().achievements, [id]: { unlockedAt: Date.now(), progress } },
        })
        return true
      },

      setAchievementProgress: (id, progress) => {
        const a = get().achievements[id]
        if (a?.unlockedAt) return
        set({ achievements: { ...get().achievements, [id]: { unlockedAt: null, progress } } })
      },

      importAll: (data) => set({ ...data }),
    }),
    { name: 'ts.progress.v1' },
  ),
)
