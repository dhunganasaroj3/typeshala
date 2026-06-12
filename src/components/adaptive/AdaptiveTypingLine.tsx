import { memo, useMemo } from 'react'
import type { Lang } from '../../types'
import { toDevanagari } from '../../engine/transliterate'

export interface AdaptiveTypingLineProps {
  /** The graded roman string for the whole lesson. */
  roman: string
  /** Optional precomputed Devanagari rendering of the whole lesson (Nepali). */
  dev?: string
  /** Current caret position (index into the roman string). */
  pos: number
  /** Per-char correctness for indices < pos (true = correct, false = wrong). */
  status: boolean[]
  lang: Lang
}

/**
 * Single centred, non-scrolling typing line (Keybr style). Each character is
 * coloured by state: already-typed correct = text-text, already-typed wrong =
 * text-error, the current character carries a block caret, everything pending is
 * text-sub. For Nepali a live Devanagari rendering of what has been typed is shown
 * above the graded roman line.
 */
function AdaptiveTypingLineImpl({ roman, dev, pos, status, lang }: AdaptiveTypingLineProps) {
  const chars = useMemo(() => Array.from(roman), [roman])

  // Live Devanagari of the current in-progress word (roman typed so far).
  const liveDev = useMemo(() => {
    if (lang !== 'ne') return ''
    const typed = chars.slice(0, pos).join('')
    const lastSpace = typed.lastIndexOf(' ')
    const currentWord = lastSpace >= 0 ? typed.slice(lastSpace + 1) : typed
    return currentWord ? toDevanagari(currentWord) : ''
  }, [chars, pos, lang])

  return (
    <div className="mx-auto w-full max-w-4xl select-none">
      {lang === 'ne' && (
        <div className="flex min-h-[5rem] items-center justify-center">
          {liveDev ? (
            <span
              className="font-devanagari text-6xl leading-none text-main"
              aria-live="polite"
            >
              {liveDev}
            </span>
          ) : dev ? (
            <span
              className="font-devanagari text-4xl leading-none text-sub opacity-50"
              aria-hidden
            >
              {dev}
            </span>
          ) : (
            <span className="text-6xl leading-none"> </span>
          )}
        </div>
      )}

      <div
        className="flex flex-wrap items-center justify-center whitespace-pre-wrap text-center font-mono text-4xl leading-relaxed tracking-wide"
        aria-label="typing target"
      >
        {chars.map((ch, i) => {
          const isCurrent = i === pos
          const typed = i < pos
          let cls = 'text-sub'
          if (typed) cls = status[i] ? 'text-text' : 'text-error'
          const display = ch === ' ' ? ' ' : ch

          if (isCurrent) {
            return (
              <span key={i} className="relative">
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-main"
                />
                <span className="text-main">{display}</span>
              </span>
            )
          }

          return (
            <span key={i} className={cls}>
              {display}
            </span>
          )
        })}
      </div>
    </div>
  )
}

const AdaptiveTypingLine = memo(AdaptiveTypingLineImpl)
AdaptiveTypingLine.displayName = 'AdaptiveTypingLine'
export default AdaptiveTypingLine
