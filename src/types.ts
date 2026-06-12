// Shared type contracts for TypeShala. All modules code against these.

export type Lang = 'en' | 'ne'
export type Mode = 'time' | 'words' | 'lesson' | 'game'
export type View = 'test' | 'adaptive' | 'lessons' | 'games' | 'stats' | 'settings'

// ---------- lessons ----------

export interface LessonItem {
  /** What is graded keystroke-by-keystroke. For English: the text itself. For Nepali: canonical roman sequence. */
  roman: string
  /** Devanagari rendering (Nepali only) — precomputed via the transliteration engine. */
  dev?: string
  /** English gloss shown as a tooltip/reward (Nepali only). */
  en?: string
}

export interface Lesson {
  id: string // "en-01", "ne-12"
  lang: Lang
  unit: string // "Home Row", "Matras"
  title: string // "f and j", "आ-कार (aa)"
  newKeys: string[] // keys/tokens introduced this lesson
  items: LessonItem[]
  minAccuracy: number // 0.95 pass gate
  stars: { two: number; three: number } // accuracy thresholds, e.g. 0.97 / 0.99
}

// ---------- results & stats ----------

export interface CharCounts {
  correct: number
  incorrect: number
  extra: number
  missed: number
  backspaces: number
}

export interface TestResult {
  id: string
  ts: number
  lang: Lang
  mode: Mode
  mode2: string // '60' | '25' | lessonId | gameId
  seconds: number
  wpm: number
  raw: number
  cpm: number
  acc: number // 0..100
  consistency: number // 0..100
  chars: CharCounts
  chart: { wpm: number[]; raw: number[]; err: number[] }
  maxCombo: number
  xp: number
  isPb: boolean
  afkInvalid: boolean
}

export interface KeyStat {
  hits: number
  misses: number
  emaLatency: number | null
  best: number | null
}

export interface PersonalBest {
  wpm: number
  raw: number
  acc: number
  consistency: number
  ts: number
}

export interface DayAggregate {
  tests: number
  timeSec: number
  bestWpm: number
  xp: number
}

export interface StreakState {
  current: number
  longest: number
  lastActive: string // local date "YYYY-MM-DD"
  shields: number
}

// ---------- gamification ----------

export interface AchievementDef {
  id: string
  name: string // may include Nepali
  desc: string
  xp: number // reward
  icon: string // emoji
  /** Returns progress 0..1 given snapshot of progress+stats state. */
  check: (snap: ProgressSnapshot) => number
}

/** Read-only snapshot handed to achievement checks after each completed activity. */
export interface ProgressSnapshot {
  lastResult: TestResult
  results: TestResult[]
  streak: StreakState
  lifetimeKeys: number
  perfectDrills: number
  lessonsPassed: Record<string, { stars: number; bestAcc: number; passed: boolean }>
  langsActiveToday: Lang[]
  bestGameScores: Record<string, number>
  ghostBeaten: boolean
  hourOfDay: number
}

export interface AchievementState {
  unlockedAt: number | null
  progress: number // 0..1
}

// ---------- celebrations ----------

export type CelebrationTier = 'small' | 'medium' | 'large' | 'epic'

export interface Toast {
  id: string
  icon: string
  title: string
  body?: string
  tier: CelebrationTier
}

// ---------- themes ----------

export interface ThemeDef {
  id: string
  name: string
  /** CSS custom property values, keys without leading `--`. */
  tokens: Record<string, string>
}
