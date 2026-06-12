import type { LangAdaptiveState } from '../../adaptive/types'
import { cpmToWpm } from '../../adaptive/constants'

interface LearningGraphProps {
  state: LangAdaptiveState
  width?: number
  height?: number
}

/**
 * WPM-over-lessons line. We flatten every per-key sample, group by lesson
 * ordinal (sample.index), average the EMA-filtered ms/char for that lesson,
 * then convert ms/char -> cpm -> wpm.
 */
function seriesFromState(state: LangAdaptiveState): number[] {
  const byIndex = new Map<number, { sum: number; count: number }>()
  for (const k of Object.values(state.keys)) {
    for (const s of k.samples) {
      const ms = s.filtered
      if (!Number.isFinite(ms) || ms <= 0) continue
      const bucket = byIndex.get(s.index) ?? { sum: 0, count: 0 }
      bucket.sum += ms
      bucket.count += 1
      byIndex.set(s.index, bucket)
    }
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, b]) => {
      const meanMs = b.sum / b.count
      const cpm = 60000 / meanMs
      return cpmToWpm(cpm)
    })
}

export default function LearningGraph({ state, width = 480, height = 120 }: LearningGraphProps) {
  const values = seriesFromState(state)

  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-surface text-xs text-sub"
        style={{ height }}
      >
        Complete more lessons to see your learning curve
      </div>
    )
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pad = 8
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW
    const y = pad + innerH - ((v - min) / range) * innerH
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const last = values[values.length - 1]
  const lastX = pad + innerW
  const lastY = pad + innerH - ((last - min) / range) * innerH

  return (
    <div className="rounded-md bg-surface p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="WPM over lessons"
      >
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          className="text-main"
        />
        <circle cx={lastX} cy={lastY} r={3} className="fill-main" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-sub">
        <span>{min.toFixed(0)} wpm</span>
        <span>{last.toFixed(0)} wpm now</span>
        <span>{max.toFixed(0)} wpm</span>
      </div>
    </div>
  )
}
