import { useMemo } from 'react'
import { useStats } from '../../store/useStats'
import { localDay } from '../../game/gamification'

const DAYS = 119 // ~17 weeks

function dayString(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** GitHub-style activity calendar of the last ~120 days, colored by daily XP quantile. */
export default function ActivityCalendar() {
  const days = useStats((s) => s.days)

  const { cells, hasData } = useMemo(() => {
    const today = new Date(localDay(Date.now()))
    const list: Array<{ date: string; xp: number }> = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = dayString(d)
      list.push({ date: key, xp: days[key]?.xp ?? 0 })
    }

    // quantile thresholds from non-zero days
    const nonZero = list.map((c) => c.xp).filter((x) => x > 0).sort((a, b) => a - b)
    const q = (p: number) =>
      nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] : 0
    const t1 = q(0.25)
    const t2 = q(0.5)
    const t3 = q(0.75)

    const level = (xp: number): number => {
      if (xp <= 0) return 0
      if (xp <= t1) return 1
      if (xp <= t2) return 2
      if (xp <= t3) return 3
      return 4
    }

    const cells = list.map((c) => ({ ...c, level: level(c.xp) }))
    return { cells, hasData: nonZero.length > 0 }
  }, [days])

  const opacities = [0.08, 0.3, 0.5, 0.75, 1]

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Activity (last ~120 days)
      </h3>
      {!hasData ? (
        <div className="text-xs text-sub">No activity recorded yet — start typing!</div>
      ) : (
        <div
          className="grid grid-flow-col gap-1"
          style={{ gridTemplateRows: 'repeat(7, 1fr)' }}
        >
          {cells.map((c) => (
            <div
              key={c.date}
              title={`${c.date}: ${c.xp} XP`}
              className="h-3 w-3 rounded-sm bg-main"
              style={{ opacity: opacities[c.level] }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
