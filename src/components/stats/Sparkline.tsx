interface SparklineProps {
  values: number[]
  width?: number
  height?: number
}

/** Minimal SVG line chart of a WPM trend (oldest -> newest). */
export default function Sparkline({ values, width = 320, height = 64 }: SparklineProps) {
  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-sub"
        style={{ height }}
      >
        Not enough data yet
      </div>
    )
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const pad = 4
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
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="WPM trend"
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-main"
      />
      <circle cx={lastX} cy={lastY} r={2.5} className="fill-main" />
    </svg>
  )
}
