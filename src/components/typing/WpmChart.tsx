import { memo } from 'react'

export interface WpmChartProps {
  wpm: number[]
  raw: number[]
  err: number[]
}

const VW = 600 // viewBox width
const VH = 200 // viewBox height
const PAD_L = 34
const PAD_R = 10
const PAD_T = 12
const PAD_B = 24

/**
 * Hand-rolled responsive line chart (no chart library).
 *  - WPM line: thick, text-main
 *  - Raw line: thinner, text-sub
 *  - Errors:   × marks at the seconds where mistakes happened, text-error
 */
function WpmChartImpl({ wpm, raw, err }: WpmChartProps) {
  const n = Math.max(wpm.length, raw.length, err.length)
  if (n === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sub text-sm">
        Not enough data to chart.
      </div>
    )
  }

  const maxY = Math.max(10, ...wpm, ...raw) * 1.1
  const innerW = VW - PAD_L - PAD_R
  const innerH = VH - PAD_T - PAD_B

  const xAt = (i: number) => PAD_L + (n <= 1 ? 0 : (i / (n - 1)) * innerW)
  const yAt = (v: number) => PAD_T + innerH - (v / maxY) * innerH

  const toPath = (data: number[]) =>
    data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`)
      .join(' ')

  // y-axis gridlines at 0, mid, max
  const ticks = [0, maxY / 2, maxY]

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      preserveAspectRatio="none"
      className="h-48 w-full"
      role="img"
      aria-label="words per minute over time"
    >
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={VW - PAD_R}
            y1={yAt(t)}
            y2={yAt(t)}
            className="stroke-surface"
            strokeWidth={1}
          />
          <text
            x={PAD_L - 6}
            y={yAt(t) + 4}
            textAnchor="end"
            className="fill-sub"
            style={{ fontSize: 10 }}
          >
            {Math.round(t)}
          </text>
        </g>
      ))}

      <path
        d={toPath(raw)}
        fill="none"
        className="stroke-sub"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
      <path
        d={toPath(wpm)}
        fill="none"
        className="stroke-main"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {err.map((e, i) =>
        e > 0 ? (
          <text
            key={i}
            x={xAt(i)}
            y={PAD_T + innerH - 2}
            textAnchor="middle"
            className="fill-error"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            ×
          </text>
        ) : null,
      )}
    </svg>
  )
}

const WpmChart = memo(WpmChartImpl)
WpmChart.displayName = 'WpmChart'
export default WpmChart
