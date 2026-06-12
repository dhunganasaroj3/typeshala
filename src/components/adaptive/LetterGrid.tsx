import type { KeyConfidence } from '../../adaptive/types'
import { useSettings } from '../../store/useSettings'
import { toDevanagari } from '../../engine/transliterate'
import { confidenceColor } from './keyboardLayout'

interface LetterGridProps {
  keyConfidences: KeyConfidence[]
}

/**
 * Per-token confidence tiles in unlock order (the order keyConfidences arrives in).
 * Uncalibrated = gray with '?', otherwise red->green by confidence.
 * Focus token gets a glow ring; locked (not included) tokens are dimmed.
 */
export default function LetterGrid({ keyConfidences }: LetterGridProps) {
  const lang = useSettings((s) => s.lang)

  if (keyConfidences.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-sub">
        No letters yet
      </div>
    )
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {keyConfidences.map((kc) => {
        const calibrated = kc.calibrated && kc.confidence != null
        const bg = calibrated ? confidenceColor(kc.confidence) : 'var(--surface, #2a2a2a)'
        const pct = kc.confidence != null ? `${Math.round(kc.confidence * 100)}%` : 'uncalibrated'
        const title = `${kc.token}: ${pct} confidence — ${kc.hits} hits, ${kc.misses} misses`
        return (
          <div
            key={kc.token}
            title={title}
            className={[
              'relative flex flex-col items-center justify-center rounded-md transition-all',
              'h-12 min-w-[3rem] px-2',
              kc.focus ? 'ring-2 ring-main shadow-[0_0_12px_var(--main,#7aa2f7)]' : '',
              kc.included ? 'opacity-100' : 'opacity-40',
            ].join(' ')}
            style={{
              backgroundColor: bg,
              color: calibrated ? '#0a0a0a' : undefined,
            }}
          >
            <span className={`text-base font-semibold leading-none ${calibrated ? '' : 'text-sub'}`}>
              {calibrated ? kc.token : '?'}
            </span>
            {!calibrated && (
              <span className="mt-0.5 text-[10px] leading-none text-sub">{kc.token}</span>
            )}
            {lang === 'ne' && (
              <span
                className={`font-devanagari mt-0.5 text-xs leading-none ${calibrated ? '' : 'text-sub'}`}
              >
                {toDevanagari(kc.token)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
