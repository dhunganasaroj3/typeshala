// Achievement definitions. Each `check` returns progress 0..1; crossing 1.0 unlocks.
import type { AchievementDef, Lang, ProgressSnapshot, TestResult } from '../types'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Best WPM over qualifying tests (>=30s, not AFK-invalid) in a language. */
function bestWpm(results: TestResult[], lang: Lang): number {
  return results
    .filter((r) => r.lang === lang && r.seconds >= 30 && !r.afkInvalid)
    .reduce((m, r) => Math.max(m, r.wpm), 0)
}

function speedAch(lang: Lang, target: number): (s: ProgressSnapshot) => number {
  return (s) => clamp01(bestWpm(s.results, lang) / target)
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-steps',
    name: 'पहिलो पाइला First Steps',
    desc: 'Complete your first test or lesson.',
    xp: 25,
    icon: '👣',
    check: (s) => (s.results.length > 0 ? 1 : 0),
  },
  {
    id: 'en-30',
    name: 'Swift',
    desc: 'Reach 30 WPM in English (test ≥30s).',
    xp: 30,
    icon: '⚡',
    check: speedAch('en', 30),
  },
  {
    id: 'en-60',
    name: 'Rapid',
    desc: 'Reach 60 WPM in English (test ≥30s).',
    xp: 50,
    icon: '🚀',
    check: speedAch('en', 60),
  },
  {
    id: 'en-90',
    name: 'Sagarmatha Speed',
    desc: 'Reach 90 WPM in English (test ≥30s).',
    xp: 100,
    icon: '🏔️',
    check: speedAch('en', 90),
  },
  {
    id: 'ne-15',
    name: 'नेपाली टाइपिस्ट',
    desc: 'Reach 15 WPM in Nepali (test ≥30s).',
    xp: 40,
    icon: '✍️',
    check: speedAch('ne', 15),
  },
  {
    id: 'ne-30',
    name: 'Danphe Fingers',
    desc: 'Reach 30 WPM in Nepali (test ≥30s).',
    xp: 80,
    icon: '🦜',
    check: speedAch('ne', 30),
  },
  {
    id: 'perfect-10',
    name: 'Sharpshooter',
    desc: 'Finish 10 drills at 100% accuracy.',
    xp: 50,
    icon: '🎯',
    check: (s) => clamp01(s.perfectDrills / 10),
  },
  {
    id: 'streak-7',
    name: 'Week of Fire',
    desc: 'Keep a 7-day streak.',
    xp: 50,
    icon: '🔥',
    check: (s) => clamp01(s.streak.longest / 7),
  },
  {
    id: 'streak-30',
    name: 'Mahina Master',
    desc: 'Keep a 30-day streak.',
    xp: 100,
    icon: '📅',
    check: (s) => clamp01(s.streak.longest / 30),
  },
  {
    id: 'combo-200',
    name: 'Combo Danphe',
    desc: 'Reach a 200 combo in one drill.',
    xp: 60,
    icon: '💥',
    check: (s) => clamp01(Math.max(0, ...s.results.map((r) => r.maxCombo)) / 200),
  },
  {
    id: 'keys-100k',
    name: 'Lakh Keys Club',
    desc: 'Type 100,000 keystrokes.',
    xp: 100,
    icon: '⌨️',
    check: (s) => clamp01(s.lifetimeKeys / 100000),
  },
  {
    id: 'dui-bhasa',
    name: 'दुई भाषा Dui Bhasa',
    desc: 'Practice English and Nepali on the same day.',
    xp: 40,
    icon: '🌐',
    check: (s) => (s.langsActiveToday.includes('en') && s.langsActiveToday.includes('ne') ? 1 : 0),
  },
  {
    id: 'conjunct-boss',
    name: 'घरको बाघ',
    desc: 'Pass both conjunct lessons (ne-13, ne-14) at ≥97%.',
    xp: 60,
    icon: '🐯',
    check: (s) => {
      const a = s.lessonsPassed['ne-13']
      const b = s.lessonsPassed['ne-14']
      const ok = (l?: { bestAcc: number }) => (l && l.bestAcc >= 0.97 ? 1 : 0)
      return (ok(a) + ok(b)) / 2
    },
  },
  {
    id: 'game-1k',
    name: 'Khukuri Warrior',
    desc: 'Score 1,000+ in Khukuri Strike.',
    xp: 50,
    icon: '🗡️',
    check: (s) => clamp01((s.bestGameScores['khukuri-strike'] ?? 0) / 1000),
  },
  {
    id: 'ghost-beat',
    name: 'Ghost Buster',
    desc: 'Beat your own ghost in Saathi Racer.',
    xp: 50,
    icon: '👻',
    check: (s) => (s.ghostBeaten ? 1 : 0),
  },
  {
    id: 'bihani',
    name: 'बिहानी Bihani',
    desc: 'Complete a drill before 7 AM.',
    xp: 25,
    icon: '🌅',
    check: (s) => (s.results.length > 0 && s.hourOfDay < 7 ? 1 : 0),
  },
]
