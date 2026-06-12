import { memo } from 'react'

export interface AdaptiveStatBarProps {
  wpm: number
  cpm: number
  accuracy: number // 0..100
  seconds: number
  focus: string | null
  lessonCount: number
  unit: 'wpm' | 'cpm'
}

interface TileProps {
  value: string
  caption: string
  accent?: string
}

function Tile({ value, caption, accent }: TileProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-3 py-2">
      <span className={`text-3xl font-bold tabular-nums ${accent ?? 'text-main'}`}>{value}</span>
      <span className="mt-0.5 text-xs uppercase tracking-wider text-sub">{caption}</span>
    </div>
  )
}

/**
 * Top band of stat tiles in the clean Keybr style: speed (WPM or CPM by unit),
 * accuracy, elapsed time, and a tile combining the lesson count with the current
 * focus token.
 */
function AdaptiveStatBarImpl({
  wpm,
  cpm,
  accuracy,
  seconds,
  focus,
  lessonCount,
  unit,
}: AdaptiveStatBarProps) {
  const speedValue = unit === 'wpm' ? Math.round(wpm) : Math.round(cpm)
  const speedCaption = unit === 'wpm' ? 'wpm' : 'cpm'

  return (
    <div className="mx-auto flex w-full max-w-4xl items-stretch divide-x divide-surface rounded-xl border border-surface bg-surface/40">
      <Tile value={String(speedValue)} caption={speedCaption} accent="text-main" />
      <Tile value={`${Math.round(accuracy)}%`} caption="accuracy" accent="text-success" />
      <Tile value={`${seconds.toFixed(1)}s`} caption="time" accent="text-text" />
      <div className="flex flex-1 flex-col items-center justify-center px-3 py-2">
        <span className="text-3xl font-bold tabular-nums text-xp">{lessonCount}</span>
        <span className="mt-0.5 flex items-center gap-1 text-xs uppercase tracking-wider text-sub">
          <span>lessons</span>
          {focus && (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono text-streak normal-case">{focus}</span>
            </>
          )}
        </span>
      </div>
    </div>
  )
}

const AdaptiveStatBar = memo(AdaptiveStatBarImpl)
AdaptiveStatBar.displayName = 'AdaptiveStatBar'
export default AdaptiveStatBar
