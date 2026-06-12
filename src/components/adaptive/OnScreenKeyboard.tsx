import type { KeyConfidence } from '../../adaptive/types'
import {
  ROWS,
  FINGER_ZONES,
  ZONES,
  aggregateTokenStats,
  confidenceColor,
} from './keyboardLayout'

interface OnScreenKeyboardProps {
  keyConfidences: KeyConfidence[]
  nextKey?: string | null
  showZones: boolean
  highlightNextKey: boolean
}

/**
 * Full QWERTY board.
 *  Layer 1: per-key confidence heatmap (aggregated from token confidences).
 *  Layer 2: finger-zone tint (when showZones).
 *  Layer 3: highlight the next expected key (when highlightNextKey).
 */
export default function OnScreenKeyboard({
  keyConfidences,
  nextKey,
  showZones,
  highlightNextKey,
}: OnScreenKeyboardProps) {
  const agg = aggregateTokenStats(keyConfidences)
  const next = (nextKey ?? '').toLowerCase()

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5" style={{ marginLeft: ri * 14 }}>
          {row.split('').map((ch) => {
            const a = agg[ch]
            const calibrated = !!a?.calibrated && a.confidence != null
            const heat = calibrated ? confidenceColor(a.confidence) : 'var(--surface, #2a2a2a)'
            const zone = showZones ? ZONES[FINGER_ZONES[ch]] : undefined
            const isNext = highlightNextKey && next.length > 0 && ch === next
            const bg = zone ? zone.color : heat
            const conf = a?.confidence
            const title = calibrated
              ? `${ch}: ${Math.round((conf ?? 0) * 100)}% confidence`
              : `${ch}: no data`
            return (
              <div
                key={ch}
                title={title}
                className={[
                  'relative flex h-10 w-10 items-center justify-center rounded text-sm font-medium transition-all',
                  isNext ? 'ring-2 ring-main text-main shadow-[0_0_14px_var(--main,#7aa2f7)] z-10' : '',
                ].join(' ')}
                style={{
                  backgroundColor: bg,
                  color: isNext ? undefined : calibrated && !zone ? '#0a0a0a' : undefined,
                  opacity: calibrated || zone || isNext ? 1 : 0.55,
                }}
              >
                <span className={isNext ? 'text-main' : calibrated || zone ? '' : 'text-sub'}>
                  {ch}
                </span>
              </div>
            )
          })}
        </div>
      ))}
      {showZones && (
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px] text-sub">
          {Object.values(ZONES).map((z) => (
            <span key={z.id} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: z.color }}
              />
              {z.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
