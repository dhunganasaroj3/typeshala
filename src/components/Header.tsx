import type { View } from '../types'
import { useUI } from '../store/useUI'
import { useProgress } from '../store/useProgress'
import {
  DAILY_GOAL_XP,
  levelForXp,
  localDay,
  titleForLevel,
  xpToReach,
} from '../game/gamification'

const NAV: Array<{ id: View; label: string }> = [
  { id: 'test', label: 'Test' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'games', label: 'Games' },
  { id: 'stats', label: 'Stats' },
  { id: 'settings', label: 'Settings' },
]

/** Circular daily-goal progress ring. */
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0))
  const r = 11
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex items-center justify-center" title={`Daily goal: ${Math.round(value)}/${goal} XP`}>
      <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-surface" />
        <circle
          cx="14"
          cy="14"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className={pct >= 1 ? 'text-success' : 'text-xp'}
          style={{ transition: 'stroke-dashoffset 400ms ease' }}
        />
      </svg>
    </div>
  )
}

export default function Header() {
  const view = useUI((s) => s.view)
  const setView = useUI((s) => s.setView)
  const typingFocus = useUI((s) => s.typingFocus)

  const xp = useProgress((s) => s.xp)
  const streak = useProgress((s) => s.streak)
  const dailyXp = useProgress((s) => s.dailyXp)

  const level = levelForXp(xp)
  const title = titleForLevel(level)
  const floor = xpToReach(level)
  const ceil = xpToReach(level + 1)
  const span = Math.max(1, ceil - floor)
  const barPct = Math.max(0, Math.min(1, (xp - floor) / span))

  const todayXp = dailyXp[localDay(Date.now())] ?? 0

  return (
    <header
      className={`w-full px-4 py-3 flex items-center gap-4 flex-wrap select-none ${
        typingFocus ? 'focus-dim' : ''
      }`}
    >
      {/* logo */}
      <button
        type="button"
        onClick={() => setView('test')}
        className="flex items-baseline gap-2 shrink-0"
        title="TypeShala"
      >
        <span className="font-devanagari text-xl text-main leading-none">टाइपशाला</span>
        <span className="text-lg text-text font-semibold tracking-tight">TypeShala</span>
      </button>

      {/* nav */}
      <nav className="flex items-center gap-1">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setView(n.id)}
            className={`px-3 py-1.5 rounded text-sm transition-colors hover:text-text ${
              view === n.id ? 'text-main' : 'text-sub'
            }`}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-5">
        {/* streak */}
        <div className="flex items-center gap-1.5 text-streak" title={`Streak: ${streak.current} days`}>
          <span className="text-lg leading-none">🔥</span>
          <span className="font-semibold tabular-nums">{streak.current}</span>
          {streak.shields > 0 && (
            <span className="text-sub text-xs flex items-center gap-0.5" title={`${streak.shields} shield(s)`}>
              🛡{streak.shields}
            </span>
          )}
        </div>

        {/* level + xp bar */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <span
            className="text-xs px-1.5 py-0.5 rounded bg-surface text-xp font-semibold tabular-nums"
            title={`${title.en} · ${xp} XP`}
          >
            {level}
          </span>
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[10px] text-sub leading-none font-devanagari">{title.ne}</span>
            <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-xp"
                style={{ width: `${barPct * 100}%`, transition: 'width 500ms ease' }}
              />
            </div>
          </div>
        </div>

        {/* daily goal ring */}
        <GoalRing value={todayXp} goal={DAILY_GOAL_XP} />
      </div>
    </header>
  )
}
