import { useSettings } from '../../store/useSettings'
import { useStats } from '../../store/useStats'

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

/**
 * Mix red (high error) -> green (low error). `t` is the error rate 0..1.
 * Laplace-smoothed error rate is computed by the caller.
 */
function rampColor(t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  // green (low error) -> red (high error)
  const hue = (1 - clamped) * 120 // 120 green -> 0 red
  return `hsl(${hue}, 60%, 45%)`
}

export default function KeyHeatmap() {
  const lang = useSettings((s) => s.lang)
  const keys = useStats((s) => s.keys)

  const errorRate = (ch: string): { rate: number; hits: number; misses: number } => {
    const k = keys[`${lang}:${ch}`]
    const hits = k?.hits ?? 0
    const misses = k?.misses ?? 0
    // Laplace smoothing so unseen keys read as neutral-ish, not perfect.
    const rate = (misses + 1) / (hits + misses + 2)
    return { rate, hits, misses }
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sub">
        Key accuracy ({lang === 'en' ? 'English' : 'Nepali roman'})
      </h3>
      <div className="flex flex-col items-center gap-1.5">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri * 14 }}>
            {row.split('').map((ch) => {
              const { rate, hits, misses } = errorRate(ch)
              const seen = hits + misses > 0
              return (
                <div
                  key={ch}
                  title={
                    seen
                      ? `${ch}: ${hits} hits, ${misses} misses (${(rate * 100).toFixed(0)}% err)`
                      : `${ch}: no data`
                  }
                  className="flex h-9 w-9 items-center justify-center rounded text-sm font-medium"
                  style={{
                    backgroundColor: seen ? rampColor(rate) : 'var(--surface, #2a2a2a)',
                    color: seen ? '#0a0a0a' : undefined,
                    opacity: seen ? 1 : 0.5,
                  }}
                >
                  <span className={seen ? '' : 'text-sub'}>{ch}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
