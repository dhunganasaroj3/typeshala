import type { Lang, StreakState, TestResult } from '../types'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const DAILY_GOAL_XP = 60
export const STREAK_GRACE_HOURS = 3 // day boundary = local 3 AM

/** Local date string "YYYY-MM-DD" with the 3 AM grace boundary applied. */
export function localDay(ts: number): string {
  const d = new Date(ts - STREAK_GRACE_HOURS * 3600_000)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function prevDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** Average WPM over the last `n` results in the same language; null if fewer than 10. */
export function personalAvgWpm(results: TestResult[], lang: Lang, n = 10): number | null {
  const recent = results.filter((r) => r.lang === lang && !r.afkInvalid).slice(0, n)
  if (recent.length < 10) return null
  return recent.reduce((s, r) => s + r.wpm, 0) / recent.length
}

export interface XpInput {
  correctChars: number
  acc: number // 0..1
  wpm: number
  maxCombo: number
  avgWpm: number | null
  firstActivityToday: boolean
  firstTimePassingLesson: boolean
}

export function computeXp(i: XpInput): number {
  const words = i.correctChars / 5
  const accMult = i.acc >= 0.97 ? 1.5 : i.acc >= 0.93 ? 1.2 : i.acc >= 0.85 ? 1.0 : 0.5
  const speedMult = i.avgWpm ? clamp(i.wpm / i.avgWpm, 0.8, 1.3) : 1.0
  const comboBonus = Math.floor(i.maxCombo / 50) * 5
  let xp = Math.round(words * accMult * speedMult) + comboBonus
  if (i.firstActivityToday) xp += 20
  if (i.firstTimePassingLesson) xp += 10
  if (i.acc >= 1) xp += 15
  return Math.max(1, xp)
}

/** Cumulative XP required to reach `level` (level 1 = 0). */
export function xpToReach(level: number): number {
  if (level <= 1) return 0
  return Math.round(60 * Math.pow(level, 1.7))
}

export function levelForXp(xp: number): number {
  let lvl = 1
  while (xpToReach(lvl + 1) <= xp) lvl++
  return lvl
}

export const LEVEL_TITLES: Array<{ min: number; ne: string; en: string }> = [
  { min: 25, ne: 'सगरमाथा', en: 'Sagarmatha' },
  { min: 20, ne: 'डाँफे', en: 'Danphe' },
  { min: 15, ne: 'टाइपवीर', en: 'Typeveer' },
  { min: 10, ne: 'लेखनदास', en: 'Lekhandas' },
  { min: 5, ne: 'अभ्यासी', en: 'Abhyasi' },
  { min: 1, ne: 'सिकारु', en: 'Sikaru' },
]

export function titleForLevel(level: number) {
  return LEVEL_TITLES.find((t) => level >= t.min) ?? LEVEL_TITLES[LEVEL_TITLES.length - 1]
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 100]

export interface StreakUpdate {
  streak: StreakState
  /** milestone hit today (3/7/14/30/100) or null */
  milestone: number | null
  shieldSpent: boolean
  shieldEarned: boolean
}

/**
 * Called when the daily goal is met for `day` (localDay of now).
 * Handles continuation, gaps (shield auto-spend for a single missed day), and milestones.
 */
export function advanceStreak(prev: StreakState, day: string): StreakUpdate {
  if (prev.lastActive === day) {
    return { streak: prev, milestone: null, shieldSpent: false, shieldEarned: false }
  }

  let current: number
  let shields = prev.shields
  let shieldSpent = false

  if (prev.lastActive === prevDay(day)) {
    current = prev.current + 1
  } else if (prev.lastActive === prevDay(prevDay(day)) && shields > 0) {
    // exactly one missed day and a shield in the bank: streak preserved, then today increments
    shields -= 1
    shieldSpent = true
    current = prev.current + 1
  } else {
    current = 1
  }

  let shieldEarned = false
  if (current > 0 && current % 7 === 0 && shields < 2) {
    shields += 1
    shieldEarned = true
  }

  const streak: StreakState = {
    current,
    longest: Math.max(prev.longest, current),
    lastActive: day,
    shields,
  }
  const milestone = STREAK_MILESTONES.includes(current) ? current : null
  return { streak, milestone, shieldSpent, shieldEarned }
}

/** Combo tier labels; returns label newly reached at exactly this count, else null. */
export function comboTier(count: number): string | null {
  switch (count) {
    case 25: return 'Nice'
    case 50: return 'Hot 🔥'
    case 100: return 'Blazing'
    case 200: return 'डाँफे mode'
    default: return null
  }
}
