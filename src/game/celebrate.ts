import confetti from 'canvas-confetti'
import type {
  CelebrationTier,
  Lang,
  Mode,
  ProgressSnapshot,
  TestResult,
  Toast,
} from '../types'
import type { ProgressEvents } from '../store/useProgress'
import type { KeyBatch } from '../store/useStats'
import type { CompletedRun } from '../components/typing/TypingCore'
import {
  accuracy as accuracyPct,
  consistency as consistencyScore,
  cpm as cpmCalc,
  rawWpm,
  wpm as wpmCalc,
} from '../engine/metrics'
import { computeXp, localDay, personalAvgWpm } from './gamification'
import { ACHIEVEMENTS } from '../data/achievements'
import { useStats } from '../store/useStats'
import { useProgress } from '../store/useProgress'
import { useUI } from '../store/useUI'
import { playChime, playFanfare } from '../audio/sounds'

const DANPHE_COLORS = ['#0ea5b7', '#22c55e', '#ef4444', '#3b82f6', '#eab308']

type PushToast = (t: Omit<Toast, 'id'>) => void

interface CelebrateArgs {
  result: TestResult
  events: ProgressEvents
  pushToast: PushToast
  newAchievements: Array<{ name: string; icon: string; xp: number }>
  reducedMotion: boolean
}

/**
 * Fire the tiered celebration: confetti (motion-gated), sounds, and toasts for
 * level-ups / PBs / streak milestones / achievements. Pure side effects.
 */
export function celebrate({
  result,
  events,
  pushToast,
  newAchievements,
  reducedMotion,
}: CelebrateArgs): void {
  let topTier: CelebrationTier = 'small'

  // ----- Medium: daily goal / nothing-large fallback chime -----
  if (events.dailyGoalJustMet) {
    topTier = bumpTier(topTier, 'medium')
    pushToast({
      icon: '🎯',
      title: 'Daily goal met!',
      body: 'Your streak is safe for today.',
      tier: 'medium',
    })
  }

  // ----- Large: PB -----
  if (result.isPb) {
    topTier = bumpTier(topTier, 'large')
    pushToast({
      icon: '🏆',
      title: 'NEW RECORD',
      body: `${Math.round(result.wpm)} WPM`,
      tier: 'large',
    })
  }

  // ----- Large: level-up -----
  if (events.leveledUpTo != null) {
    topTier = bumpTier(topTier, 'large')
    pushToast({
      icon: '⬆️',
      title: `Level ${events.leveledUpTo}!`,
      body: 'Leveled up.',
      tier: 'large',
    })
  }

  // ----- Achievements -----
  for (const a of newAchievements) {
    topTier = bumpTier(topTier, 'large')
    pushToast({
      icon: a.icon,
      title: a.name,
      body: `+${a.xp} XP`,
      tier: 'large',
    })
  }

  // ----- Shields -----
  if (events.shieldSpent) {
    pushToast({
      icon: '🛡️',
      title: 'Shield saved your streak',
      tier: 'medium',
    })
    topTier = bumpTier(topTier, 'medium')
  }
  if (events.shieldEarned) {
    pushToast({
      icon: '🛡️',
      title: 'Streak shield earned',
      body: 'Banked for a rainy day.',
      tier: 'medium',
    })
    topTier = bumpTier(topTier, 'medium')
  }

  // ----- Streak milestone (epic on 7/30/100) -----
  if (events.streakMilestone != null) {
    const m = events.streakMilestone
    const epic = m === 7 || m === 30 || m === 100
    topTier = bumpTier(topTier, epic ? 'epic' : 'large')
    pushToast({
      icon: '🔥',
      title: `${m}-day streak!`,
      body: epic ? 'On fire!' : undefined,
      tier: epic ? 'epic' : 'large',
    })
  }

  // ----- Sound -----
  if (topTier === 'medium') playChime()
  else if (topTier === 'large' || topTier === 'epic') playFanfare()

  // ----- Confetti (motion-gated) -----
  if (!reducedMotion) {
    if (topTier === 'epic') {
      fireEpicConfetti()
    } else if (topTier === 'large') {
      confetti({
        particleCount: 120,
        spread: 75,
        origin: { y: 0.6 },
        colors: DANPHE_COLORS,
        disableForReducedMotion: true,
      })
    } else if (topTier === 'medium') {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.4 },
        colors: DANPHE_COLORS,
        disableForReducedMotion: true,
      })
    }
  }
}

function bumpTier(cur: CelebrationTier, next: CelebrationTier): CelebrationTier {
  const order: CelebrationTier[] = ['small', 'medium', 'large', 'epic']
  return order.indexOf(next) > order.indexOf(cur) ? next : cur
}

function fireEpicConfetti(): void {
  const end = Date.now() + 1200
  const frame = () => {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 70,
      origin: { x: 0 },
      colors: DANPHE_COLORS,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 70,
      origin: { x: 1 },
      colors: DANPHE_COLORS,
      disableForReducedMotion: true,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

// ---------------------------------------------------------------------------
// Result pipeline
// ---------------------------------------------------------------------------

export interface ResultPipelineInput {
  lang: Lang
  mode: Mode
  mode2: string
  run: CompletedRun
  /** Code-point count of correctly typed output (for CPM, Nepali). Defaults to correctChars. */
  cpmCorrectCodePoints?: number
}

let resultSeq = 0

function reducedMotionNow(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * runResultPipeline(input): TestResult
 *
 * Turns a finished CompletedRun into a TestResult, persists it to all stores,
 * evaluates achievements, and fires celebrations. Callable outside React (uses
 * `getState()` on the zustand stores). Returns the stored TestResult.
 */
export function runResultPipeline(input: ResultPipelineInput): TestResult {
  const { lang, mode, mode2, run } = input
  const stats = useStats.getState()
  const progress = useProgress.getState()
  const ui = useUI.getState()

  const seconds = Math.max(0.001, run.seconds)
  const correctChars = run.correctChars
  const incorrect = run.incorrect
  const allTyped = run.allTypedChars

  const wpm = wpmCalc(correctChars, seconds)
  const raw = rawWpm(allTyped, seconds)
  const acc = accuracyPct(correctChars, incorrect) // 0..100
  const acc01 = acc / 100
  const cons = consistencyScore(run.perSecondRaw)
  const codePoints = input.cpmCorrectCodePoints ?? correctChars
  const cpm = cpmCalc(codePoints, seconds)

  const ts = Date.now()
  const day = localDay(ts)
  const firstActivityToday = (progress.dailyXp[day] ?? 0) === 0
  const perfect = incorrect === 0 && allTyped > 0

  const avgWpm = personalAvgWpm(stats.results, lang)
  const xp = computeXp({
    correctChars,
    acc: acc01,
    wpm,
    maxCombo: run.maxCombo,
    avgWpm,
    firstActivityToday,
    firstTimePassingLesson: false,
  })

  const result: TestResult = {
    id: `r-${ts}-${++resultSeq}`,
    ts,
    lang,
    mode,
    mode2,
    seconds,
    wpm,
    raw,
    cpm,
    acc,
    consistency: cons,
    chars: {
      correct: correctChars,
      incorrect,
      extra: 0,
      missed: 0,
      backspaces: run.backspaces,
    },
    chart: { wpm: run.perSecondWpm, raw: run.perSecondRaw, err: run.perSecondErr },
    maxCombo: run.maxCombo,
    xp,
    isPb: false,
    afkInvalid: false,
  }

  // Persist result + per-key stats.
  const isPb = stats.saveResult(result)
  result.isPb = isPb
  stats.mergeKeyStats(lang, run.keyBatch as KeyBatch)

  // XP / streak / lifetime housekeeping.
  const events = progress.addActivity({
    xp,
    ts,
    lang,
    keystrokes: allTyped + run.backspaces,
    perfect,
  })

  // Evaluate achievements against a fresh snapshot.
  const newAchievements = evaluateAchievements(result, ts)

  celebrate({
    result,
    events,
    pushToast: ui.pushToast,
    newAchievements,
    reducedMotion: reducedMotionNow(),
  })

  return result
}

function evaluateAchievements(
  lastResult: TestResult,
  ts: number,
): Array<{ name: string; icon: string; xp: number }> {
  const stats = useStats.getState()
  const progress = useProgress.getState()
  const day = localDay(ts)

  const lessonsPassed: ProgressSnapshot['lessonsPassed'] = {}
  for (const [id, lp] of Object.entries(progress.lessons)) {
    lessonsPassed[id] = { stars: lp.stars, bestAcc: lp.bestAcc, passed: lp.passed }
  }

  const snap: ProgressSnapshot = {
    lastResult,
    results: stats.results,
    streak: progress.streak,
    lifetimeKeys: progress.lifetimeKeys,
    perfectDrills: progress.perfectDrills,
    lessonsPassed,
    langsActiveToday: progress.langsByDay[day] ?? [],
    bestGameScores: progress.bestGameScores,
    ghostBeaten: progress.ghostBeaten,
    hourOfDay: new Date(ts).getHours(),
  }

  const unlocked: Array<{ name: string; icon: string; xp: number }> = []
  for (const def of ACHIEVEMENTS) {
    let p = 0
    try {
      p = def.check(snap)
    } catch {
      p = 0
    }
    p = Math.max(0, Math.min(1, p))
    if (p >= 1) {
      const didUnlock = progress.unlockAchievement(def.id, 1)
      if (didUnlock) {
        unlocked.push({ name: def.name, icon: def.icon, xp: def.xp })
      }
    } else {
      progress.setAchievementProgress(def.id, p)
    }
  }
  return unlocked
}
